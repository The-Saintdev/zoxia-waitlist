/**
 * ZOXIA Waitlist — Diagnostic Health Check for Cloudflare Pages Functions
 * Endpoint: GET /api/health
 */

export async function onRequestGet(context) {
  const { env } = context;

  let apiKey = env?.MAILJET_API_KEY || env?.MAILJET_PUBLIC_KEY || env?.API_KEY || '';
  let secretKey = env?.MAILJET_SECRET_KEY || env?.MAILJET_PRIVATE_KEY || env?.SECRET_KEY || '';
  const fromEmail = env?.SMTP_FROM || env?.MAILJET_FROM || 'noreply@zoxia.site';

  if (env?.MAILJET_CREDENTIALS && env.MAILJET_CREDENTIALS.includes(':')) {
    const parts = env.MAILJET_CREDENTIALS.trim().split(':');
    apiKey = parts[0].trim();
    secretKey = parts[1].trim();
  }

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
