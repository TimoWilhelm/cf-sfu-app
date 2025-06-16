import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "./context";
import { SfuClient } from "./sfu";
import { generateTurnCredentials } from "./turn";

const { procedure: publicProcedure, router } = initTRPC
  .context<Context>()
  .create();

const sfuProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.env.SFU_APP_ID || !ctx.env.SFU_APP_TOKEN) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      cause: "SFU not configured",
    });
  }
  const sfuClient = new SfuClient(ctx.env.SFU_APP_ID, ctx.env.SFU_APP_TOKEN);
  return next({ ctx: { ...ctx, sfuClient } });
});

export const appRouter = router({
  createSession: sfuProcedure.mutation(async ({ ctx }) => {
    const repsonse = await ctx.sfuClient.createSession();
    if (!repsonse.data) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        cause: repsonse.error,
      });
    }

    return { sessionId: repsonse.data.sessionId };
  }),

  pushTracks: sfuProcedure
    .input(
      z.object({
        sessionId: z.string(),
        sdp: z.string(),
        tracks: z.array(
          z.object({
            mid: z.string(),
            trackName: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.sfuClient.pushTracks(
        input.sessionId,
        input.sdp,
        input.tracks
      );
     
      if (!result.data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          cause: result.error,
        });
      }

      return result.data;
    }),

  pullTracks: sfuProcedure
    .input(
      z.object({
        sessionId: z.string(),
        tracksToPull: z.array(
          z.object({
            trackName: z.string(),
            sessionId: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.sfuClient.pullTracks(
        input.sessionId,
        input.tracksToPull
      );
      
      if (!result.data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          cause: result.error,
        });
      }

      return result.data;
    }),

  renegotiate: sfuProcedure
    .input(
      z.object({
        sessionId: z.string(),
        sdp: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sfuClient = new SfuClient(
        ctx.env.SFU_APP_ID,
        ctx.env.SFU_APP_TOKEN
      );
      const result = await sfuClient.renegotiate(input.sessionId, input.sdp);
      
      if (!result.data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          cause: result.error,
        });
      }

      return result.data;
    }),

  generateTurnCredentials: publicProcedure.mutation(async ({ ctx }) => {
    try {
      return await generateTurnCredentials(
        ctx.env.TURN_TOKEN_ID,
        ctx.env.TURN_API_TOKEN
      );
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        cause: error,
      }) 
    }
  }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
