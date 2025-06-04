import { initTRPC } from "@trpc/server";
import { z } from "zod";
import type { Context } from "./context";
import { SfuClient } from "./sfu";

export const t = initTRPC.context<Context>().create();

export const appRouter = t.router({
  createSession: t.procedure
    .mutation(async ({ ctx }) => {
      const sfuClient = new SfuClient(ctx.env.SFU_APP_ID, ctx.env.SFU_APP_TOKEN);
      const sessionId = await sfuClient.createSession();
      return { sessionId };
    }),

  pushTracks: t.procedure
    .input(z.object({
      sessionId: z.string(),
      sdp: z.string(),
      tracks: z.array(z.object({
        mid: z.string(),
        trackName: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const sfuClient = new SfuClient(ctx.env.SFU_APP_ID, ctx.env.SFU_APP_TOKEN);
      const result = await sfuClient.pushTracks(input.sessionId, input.sdp, input.tracks);
      return result;
    }),

  pullTracks: t.procedure
    .input(z.object({
      sessionId: z.string(),
      tracksToPull: z.array(z.object({
        trackName: z.string(),
        sessionId: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const sfuClient = new SfuClient(ctx.env.SFU_APP_ID, ctx.env.SFU_APP_TOKEN);
      const result = await sfuClient.pullTracks(input.sessionId, input.tracksToPull);
      return result;
    }),

  renegotiate: t.procedure
    .input(z.object({
      sessionId: z.string(),
      sdp: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sfuClient = new SfuClient(ctx.env.SFU_APP_ID, ctx.env.SFU_APP_TOKEN);
      const result = await sfuClient.renegotiate(input.sessionId, input.sdp);
      return result;
    }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
