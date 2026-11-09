// One-time OAuth callback — exchanges Shopify auth code for an access token
// Visit once to authorize, then copy the token into Vercel env vars

export default async function handler(req, res) {
  const { code, shop } = req.query;

  if (!code || !shop) {
    return res.status(400).send('Missing code or shop parameter.');
  }

  const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
  const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
  });

  // Shopify answers with an HTML page (not JSON) for some errors, e.g. a client ID /
  // client secret mismatch or an already-used code — show it instead of crashing.
  const raw = await tokenRes.text();
  let data = {};
  try { data = JSON.parse(raw); } catch {}

  if (!tokenRes.ok || !data.access_token) {
    const detail = data.error_description || data.error || data.errors
      || raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
    console.error('shopify-callback: token exchange failed', tokenRes.status, detail);
    return res.status(500).send(
      `Failed to get access token (Shopify HTTP ${tokenRes.status}): ${escapeHtml(String(typeof detail === 'string' ? detail : JSON.stringify(detail)))}`
    );
  }

  // Display the token — copy it into Vercel as SHOPIFY_ADMIN_TOKEN
  return res.status(200).send(`
    <html>
      <head><style>
        body { font-family: monospace; background: #001219; color: #fafafa; padding: 40px; }
        h2 { color: #c87a41; }
        .token { background: #022e4b; padding: 20px; border-radius: 8px; font-size: 1.1rem;
                 word-break: break-all; margin: 20px 0; border: 1px solid #c87a41; }
        p { color: #8f8d8d; }
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

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
