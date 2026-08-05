// One-time OAuth callback — exchanges Shopify auth code for an access token
// Visit once to authorize, then copy the token into Vercel env vars

export default async function handler(req, res) {
  const { code, shop, state, hmac, ...rest } = req.query;

  if (!code || !shop) {
    return res.status(400).send('Missing code or shop parameter.');
  }

  const CLIENT_ID     = process.env.SHOPIFY_CLIENT_ID;
  const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
  });

  const data = await tokenRes.json();

  if (!tokenRes.ok || !data.access_token) {
    return res.status(500).send('Failed to get access token: ' + JSON.stringify(data));
  }

  // Display the token — copy it into Vercel as SHOPIFY_ADMIN_TOKEN
  return res.status(200).send(`
    <html>
    <head><style>
      body { font-family: monospace; background: #001219; color: #fafafa; padding: 40px; }
      h2   { color: #c87a41; }
      .token { background: #022e4b; padding: 20px; border-radius: 8px; font-size: 1.1rem;
               word-break: break-all; margin: 20px 0; border: 1px solid #c87a41; }
      p    { color: #8f8d8d; }
    </style></head>
    <body>
      <h2>✓ Shopify Access Token</h2>
      <p>Copy this token and add it to Vercel as <strong>SHOPIFY_ADMIN_TOKEN</strong>:</p>
      <div class="token">${data.access_token}</div>
      <p>Scopes granted: ${data.scope}</p>
      <p style="color:#f87171;margin-top:20px;">⚠ Close this tab after copying. Do not share this token.</p>
    </body>
    </html>
  `);
}
