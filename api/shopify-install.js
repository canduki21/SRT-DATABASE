// Redirects to Shopify OAuth with properly encoded parameters
export default function handler(req, res) {
  const shop = 'exolith-lab.myshopify.com';
  const clientId = (process.env.SHOPIFY_CLIENT_ID || '').trim();
  const redirectUri = 'https://srt-database.vercel.app/api/shopify-callback';
  // read_products: variant weights + HS codes for DDP quotes; draft orders: DDP checkout
  const scopes = 'write_draft_orders,read_draft_orders,read_products';
  const state = 'ddp-setup';

  const url = `https://${shop}/admin/oauth/authorize`
    + `?client_id=${clientId}`
    + `&scope=${encodeURIComponent(scopes)}`
    + `&redirect_uri=${encodeURIComponent(redirectUri)}`
    + `&state=${state}`;

  res.redirect(302, url);
}
