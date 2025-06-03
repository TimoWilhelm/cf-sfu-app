import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContextFactory } from "./context";
import { appRouter } from "./router";
export default {
  async fetch(req, env, ctx): Promise<Response> {
    return fetchRequestHandler({
      endpoint: "/trpc",
      req,
      router: appRouter,
      createContext: createContextFactory(env, ctx),
    });
  },
} satisfies ExportedHandler<Env>;
