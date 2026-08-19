/**
 * ZOXIA Waitlist — Diagnostic Health Check for Cloudflare Pages Functions
 * Endpoint: GET /api/health
 */

export async function onRequestGet(context) {
  const { env } = context;

  const apiKey = env?.MAILJET_API_KEY || env?.MAILJET_PUBLIC_KEY || env?.MAILJET_KEY || env?.MJ_APIKEY_PUBLIC || env?.API_KEY;
  const secretKey = env?.MAILJET_SECRET_KEY || env?.MAILJET_PRIVATE_KEY || env?.MAILJET_SECRET || env?.MJ_APIKEY_PRIVATE || env?.SECRET_KEY;
  const fromEmail = env?.SMTP_FROM || env?.MAILJET_FROM || env?.MAILJET_SENDER || env?.SENDER_EMAIL || 'noreply@zoxia.site';

  // List all available env keys (names only, no secrets exposed)
  const availableEnvKeys = env ? Object.keys(env) : [];

  return new Response(JSON.stringify({
    status: 'online',
    hasMailjetKey: !!apiKey,
    hasMailjetSecret: !!secretKey,
    fromEmail: fromEmail,
    detectedKeys: availableEnvKeys,
    timestamp: new Date().toISOString(),
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
