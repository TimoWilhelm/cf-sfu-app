import { useRef, useState } from "react";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../worker/router";

const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/trpc",
    }),
  ],
});

function App() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<string>("Idle");

  function validateSessionDescription(sessionDescription: {
    type?: "answer" | "offer" | undefined;
    sdp?: string | undefined;
} | undefined): RTCSessionDescriptionInit {
    if (!sessionDescription || !sessionDescription.sdp || !sessionDescription.type) {
      throw new Error("Invalid session description");
    }
    return {
      type: sessionDescription.type,
      sdp: sessionDescription.sdp,
    };
}

  async function startEcho() {
    setStatus("Requesting media...");
    // 1. Get local media
    const media = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = media;
    }

    setStatus("Creating local session...");
    // 2. Create local session
    const { sessionId: localSessionId } = await trpc.createSession.mutate();

    // 3. Create local peer connection
    const localPeerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
      bundlePolicy: "max-bundle",
    });

    // 4. Add tracks as sendonly
    const transceivers = media
      .getTracks()
      .map((track) =>
        localPeerConnection.addTransceiver(track, { direction: "sendonly" })
      );

    // 5. Create offer and set as local description
    const localOffer = await localPeerConnection.createOffer();
    await localPeerConnection.setLocalDescription(localOffer);

    setStatus("Pushing tracks...");
    // 6. Push tracks to backend (tRPC)
    const pushTracksResponse = await trpc.pushTracks.mutate({
      sessionId: localSessionId,
      sdp: localOffer.sdp!,
      tracks: transceivers.map(({ mid, sender }) => ({
        location: "local",
        mid: mid!,
        trackName: sender.track?.id || "",
      })),
    });

    // 7. Set remote description from backend answer
    await localPeerConnection.setRemoteDescription(
      new RTCSessionDescription(
        validateSessionDescription(pushTracksResponse.sessionDescription)
      )
    );

    setStatus("Creating remote session...");
    // 8. Prepare to pull tracks (echo)
    const tracksToPull = transceivers.map(({ sender }) => ({
      location: "remote",
      trackName: sender.track?.id || "",
      sessionId: localSessionId,
    }));

    // 9. Create remote session
    const { sessionId: remoteSessionId } = await trpc.createSession.mutate();

    // 10. Create remote peer connection
    const remotePeerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
      bundlePolicy: "max-bundle",
    });

    // 11. Listen for remote tracks
    const remoteStream = new MediaStream();
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    remotePeerConnection.addEventListener("track", (event) => {
      remoteStream.addTrack(event.track);
    });

    setStatus("Pulling tracks...");
    // 12. Pull tracks from backend (tRPC)
    const pullTracksResponse = await trpc.pullTracks.mutate({
      sessionId: remoteSessionId,
      tracksToPull,
    });

    // 13. Set remote description from backend offer
    await remotePeerConnection.setRemoteDescription(
      new RTCSessionDescription(validateSessionDescription(pullTracksResponse.sessionDescription))
    );

    // 14. Create answer and set as local description
    const remoteAnswer = await remotePeerConnection.createAnswer();
    await remotePeerConnection.setLocalDescription(remoteAnswer);

    // 15. Renegotiate with backend if needed
    await trpc.renegotiate.mutate({
      sessionId: remoteSessionId,
      sdp: remoteAnswer.sdp!,
    });

    setStatus("Echo established!");
  }

  return (
    <div className="grid">
      <h1>Calls Echo Demo (tRPC)</h1>
      <div>
        <h2>Local stream</h2>
        <video ref={localVideoRef} autoPlay muted playsInline />
      </div>
      <div>
        <h2>Remote echo stream</h2>
        <video ref={remoteVideoRef} autoPlay muted playsInline />
      </div>
      <div style={{ gridColumn: "1 / -1", marginTop: "1rem" }}>
        <button onClick={startEcho}>Start Echo</button>
        <div>Status: {status}</div>
      </div>
    </div>
  );
}

export default App;
