import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
export const createContextFactory =
  (env: Env, ctx: ExecutionContext) =>
  ({ req, resHeaders }: FetchCreateContextFnOptions) => {
    return { req, resHeaders, env, ctx };
  };

export type Context = Awaited<
  ReturnType<ReturnType<typeof createContextFactory>>
>;
