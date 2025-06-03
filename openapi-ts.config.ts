import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input:
    "https://developers.cloudflare.com/realtime/static/calls-api-2024-05-21.yaml",
  output: "worker/sfu/client",
  plugins: ["@hey-api/client-fetch"],
});
