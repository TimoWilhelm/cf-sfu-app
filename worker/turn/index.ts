export type IceServersResponse = {
  iceServers: Array<{
    urls: string[] | string;
    username?: string;
    credential?: string;
  }>;
};

export async function generateTurnCredentials(
  tokenId: string,
  tokenKey: string,
  customIdentifier?: string
): Promise<IceServersResponse> {
  const url = `https://rtc.live.cloudflare.com/v1/turn/keys/${tokenId}/credentials/generate-ice-servers`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ttl: 86400, customIdentifier }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get TURN credentials: ${response.statusText}`);
  }

  return response.json<IceServersResponse>();
}
