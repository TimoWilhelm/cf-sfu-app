import { useRef, useState } from "react";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../worker/router";

function throwExpression(error: Error): never {
  throw error;
}

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

  function validateSessionDescription(
    sessionDescription:
      | {
          type?: "answer" | "offer" | undefined;
          sdp?: string | undefined;
        }
      | undefined
  ): RTCSessionDescriptionInit {
    if (
      !sessionDescription ||
      !sessionDescription.sdp ||
      !sessionDescription.type
    ) {
      throw new Error("Invalid session description");
    }
    return {
      type: sessionDescription.type,
      sdp: sessionDescription.sdp,
    };
  }

  async function startEcho() {
    setStatus("Requesting media...");
    // Get local media
    const media = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = media;
    }

    setStatus("Creating local session...");
    // Create local session
    const { sessionId: localSessionId } = await trpc.createSession.mutate();

    // Create local peer connection
    const localPeerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
      bundlePolicy: "max-bundle",
    });

    // Add tracks as sendonly
    const transceivers = media
      .getTracks()
      .map((track) =>
        localPeerConnection.addTransceiver(track, { direction: "sendonly" })
      );

    // 5. Create offer and set as local description
    const localOffer = await localPeerConnection.createOffer();
    await localPeerConnection.setLocalDescription(localOffer);

    setStatus("Pushing tracks...");
    // Push tracks to backend (tRPC)
    const pushTracksResponse = await trpc.pushTracks.mutate({
      sessionId: localSessionId,
      sdp: localOffer.sdp ?? throwExpression(new Error("SDP is missing")),
      tracks: transceivers.map(({ mid, sender }) => ({
        mid: mid ?? throwExpression(new Error("MID is missing")),
        trackName:
          sender.track?.id ?? throwExpression(new Error("Track ID is missing")),
      })),
    });

    // Set remote description from backend answer
    await localPeerConnection.setRemoteDescription(
      new RTCSessionDescription(
        validateSessionDescription(pushTracksResponse.sessionDescription)
      )
    );

    // Renegotiate with backend if needed (should be false for echo, but we handle it anyway)
    if (pushTracksResponse.requiresImmediateRenegotiation) {
      await trpc.renegotiate.mutate({
        sessionId: localSessionId,
        sdp: localOffer.sdp ?? throwExpression(new Error("SDP is missing")),
      });
    }

    // Upstream session is ready

    setStatus("Creating remote session...");
    // Prepare to pull tracks (echo)
    const tracksToPull = transceivers.map(({ sender }) => ({
      trackName:
        sender.track?.id ?? throwExpression(new Error("Track ID is missing")),
      sessionId: localSessionId,
    }));

    // Create remote session
    const { sessionId: remoteSessionId } = await trpc.createSession.mutate();

    // Create remote peer connection
    const remotePeerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
      bundlePolicy: "max-bundle",
    });

    // Listen for remote tracks
    const remoteStream = new MediaStream();
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    remotePeerConnection.addEventListener("track", (event) => {
      remoteStream.addTrack(event.track);
    });

    setStatus("Pulling tracks...");
    // Pull tracks from backend (tRPC)
    const pullTracksResponse = await trpc.pullTracks.mutate({
      sessionId: remoteSessionId,
      tracksToPull,
    });

    // Set remote description from backend offer
    await remotePeerConnection.setRemoteDescription(
      new RTCSessionDescription(
        validateSessionDescription(pullTracksResponse.sessionDescription)
      )
    );

    // Create answer and set as local description
    const remoteAnswer = await remotePeerConnection.createAnswer();
    await remotePeerConnection.setLocalDescription(remoteAnswer);

    // Renegotiate with backend if needed
    if (pullTracksResponse.requiresImmediateRenegotiation) {
      await trpc.renegotiate.mutate({
        sessionId: remoteSessionId,
        sdp: remoteAnswer.sdp ?? throwExpression(new Error("SDP is missing")),
      });
    }

    setStatus("Echo established!");
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
        minHeight: "100vh",
        justifyContent: "center",
      }}
    >
      <h1>Calls Echo Demo (tRPC)</h1>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "2rem",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h2>Local stream</h2>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: 320,
              height: 240,
              background: "#222",
              borderRadius: 8,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h2>Remote echo stream</h2>
          <video
            ref={remoteVideoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: 320,
              height: 240,
              background: "#222",
              borderRadius: 8,
            }}
          />
        </div>
      </div>
      <div style={{ marginTop: "1rem", textAlign: "center" }}>
        <button
          onClick={startEcho}
          style={{ padding: "0.5rem 1.5rem", fontSize: "1rem" }}
        >
          Start Echo
        </button>
        <div style={{ marginTop: "0.5rem" }}>Status: {status}</div>
      </div>
    </div>
  );
}

export default App;
