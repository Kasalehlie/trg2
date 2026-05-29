function resultPage(status, payload, targetOrigin) {
  const body = `<!doctype html><html><body><script>
    (function() {
      function send(msg) { window.opener && window.opener.postMessage(msg, ${JSON.stringify(targetOrigin)}); }
      window.addEventListener("message", function() {
        send('authorization:github:${status}:${JSON.stringify(payload)}');
      }, { once: true });
      send("authorizing:github");
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
  const siteOrigin = `https://${event.headers.host}`;

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
    }),
  });
  const data = await res.json();

  if (!data.access_token) {
    return resultPage("error", { error: data.error || "unknown" }, siteOrigin);
  }
  return resultPage("success", { token: data.access_token, provider: "github" }, siteOrigin);
}
