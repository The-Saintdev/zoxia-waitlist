/**
 * ZOXIA Waitlist — Diagnostic Health Check for Cloudflare Pages Functions
 * Endpoint: GET /api/health
 */

export async function onRequestGet(context) {
  const { env } = context;

  return new Response(JSON.stringify({
    status: 'online',
    hasMailjetKey: !!env?.MAILJET_API_KEY,
    hasMailjetSecret: !!env?.MAILJET_SECRET_KEY,
    fromEmail: env?.SMTP_FROM || env?.MAILJET_FROM || 'noreply@zoxia.site',
    timestamp: new Date().toISOString(),
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
