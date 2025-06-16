import { createClient, type Client } from "@hey-api/client-fetch";
import {
  postAppsByAppIdSessionsNew,
  postAppsByAppIdSessionsBySessionIdTracksNew,
  putAppsByAppIdSessionsBySessionIdRenegotiate,
} from "./client";

export class SfuClient {
  #appId: string;
  #client: Client;

  constructor(appId: string, appToken: string) {
    this.#appId = appId;

    this.#client = createClient({
      baseUrl: "https://rtc.live.cloudflare.com/v1",
      headers: {
        Authorization: `Bearer ${appToken}`,
      },
    });

    this.#client.interceptors.response.use((response) => {
      if (!response.ok) {
        console.log(`request to ${response.url} failed`);
      }
      return response;
    });
  }

  async createSession() {
    return await postAppsByAppIdSessionsNew({
      client: this.#client,
      path: {
        appId: this.#appId,
      },
    });
  }

  /**
   * Push local tracks to the session (sendonly)
   */
  async pushTracks(
    sessionId: string,
    sdp: string,
    tracks: Array<{ mid: string; trackName: string }>
  ) {
    return await postAppsByAppIdSessionsBySessionIdTracksNew({
      client: this.#client,
      path: {
        appId: this.#appId,
        sessionId,
      },
      body: {
        sessionDescription: {
          sdp,
          type: "offer",
        },
        tracks: tracks.map((t) => ({
          location: "local",
          mid: t.mid,
          trackName: t.trackName,
        })),
      },
    });
  }

  /**
   * Pull remote tracks from the session (recvonly)
   */
  async pullTracks(
    sessionId: string,
    tracksToPull: Array<{ trackName: string; sessionId: string }>
  ) {
    return await postAppsByAppIdSessionsBySessionIdTracksNew({
      client: this.#client,
      path: {
        appId: this.#appId,
        sessionId,
      },
      body: {
        tracks: tracksToPull.map((t) => ({
          location: "remote",
          trackName: t.trackName,
          sessionId: t.sessionId,
        })),
      },
    });
  }

  /**
   * Renegotiate the session (for answer)
   */
  async renegotiate(sessionId: string, sdp: string) {
    return await putAppsByAppIdSessionsBySessionIdRenegotiate({
      client: this.#client,
      path: {
        appId: this.#appId,
        sessionId,
      },
      body: {
        sessionDescription: {
          sdp,
          type: "answer",
        },
      },
    });
  }
}
