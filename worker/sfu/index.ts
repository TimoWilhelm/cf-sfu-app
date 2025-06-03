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
    const response = await postAppsByAppIdSessionsNew({
      client: this.#client,
      path: {
        appId: this.#appId,
      },
    });

    if (!response.data) {
      throw new Error(
        `Failed to create session: ${JSON.stringify(response.error)}`
      );
    }

    return response.data.sessionId;
  }

  /**
   * Push local tracks to the session (sendonly)
   */
  async pushTracks(
    sessionId: string,
    sdp: string,
    tracks: Array<{ mid: string; trackName: string }>
  ) {
    const response = await postAppsByAppIdSessionsBySessionIdTracksNew({
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

    if (!response.data) {
      throw new Error(
        `Failed to push tracks: ${JSON.stringify(response.error)}`
      );
    }

    return response.data;
  }

  /**
   * Pull remote tracks from the session (recvonly)
   */
  async pullTracks(
    sessionId: string,
    tracksToPull: Array<{ trackName: string; sessionId: string }>
  ) {
    const response = await postAppsByAppIdSessionsBySessionIdTracksNew({
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

    if (!response.data) {
      throw new Error(
        `Failed to pull tracks: ${JSON.stringify(response.error)}`
      );
    }

    return response.data;
  }

  /**
   * Renegotiate the session (for answer)
   */
  async renegotiate(sessionId: string, sdp: string) {
    const response = await putAppsByAppIdSessionsBySessionIdRenegotiate({
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

    if (!response.data) {
      throw new Error(
        `Failed to renegotiate session: ${JSON.stringify(response.error)}`
      );
    }

    return response.data;
  }
}
