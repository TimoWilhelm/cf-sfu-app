import { SfuClient } from "./sfu";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const sfuClient = new SfuClient(env.SFU_APP_ID, env.SFU_APP_TOKEN);

      const sessionId = await sfuClient.createSession();

      return Response.json({
        name: sessionId,
      });
    }
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
