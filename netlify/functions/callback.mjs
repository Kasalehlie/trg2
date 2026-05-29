function resultPage(status, payload, targetOrigin) {
  // Build the exact Decap/Sveltia handshake string, then JSON-encode the whole
  // message so it embeds safely as a JS string literal (no quote-escaping bugs).
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  const body = `<!doctype html><html><body><script>
    (function() {
      function receiveMessage(e) {
        window.opener && window.opener.postMessage(${JSON.stringify(message)}, ${JSON.stringify(targetOrigin)});
        window.removeEventListener("message", receiveMessage, false);
      }
      window.addEventListener("message", receiveMessage, false);
      window.opener && window.opener.postMessage("authorizing:github", ${JSON.stringify(targetOrigin)});
    })();
  </script></body></html>`;
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
      // Clear the state cookie now that the flow is complete.
      "Set-Cookie": "oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
    },
    body,
  };
}

export async function handler(event) {
  const params = event.queryStringParameters || {};
  const code = params.code;
  const returnedState = params.state;
  const cookie = event.headers.cookie || "";
  const savedState = (cookie.match(/(?:^|;\s*)oauth_state=([^;]+)/) || [])[1];
  const host = event.headers.host;
  const siteOrigin = `https://${host}`;

  // CSRF check: state must be present and match the cookie set by auth.mjs.
  if (!code || !returnedState || !savedState || returnedState !== savedState) {
    return resultPage("error", { error: "invalid_state" }, siteOrigin);
  }

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.OAUTH_GITHUB_CLIENT_ID,
      client_secret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${siteOrigin}/.netlify/functions/callback`,
    }),
  });
  const data = await res.json();

  if (!data.access_token) {
    return resultPage("error", { error: data.error || "unknown" }, siteOrigin);
  }
  return resultPage("success", { token: data.access_token, provider: "github" }, siteOrigin);
}
