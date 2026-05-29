import crypto from "node:crypto";

export async function handler(event) {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const host = event.headers.host;
  const redirectUri = `https://${host}/.netlify/functions/callback`;
  const state = crypto.randomUUID();
  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=public_repo` +
    `&state=${state}`;
  return {
    statusCode: 302,
    headers: {
      Location: url,
      "Set-Cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    },
    body: "",
  };
}
