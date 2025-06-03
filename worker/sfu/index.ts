import { createClient, type Client } from "@hey-api/client-fetch";
import { postAppsByAppIdSessionsNew } from "./client";

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

    return response.data?.sessionId;
  }
}
