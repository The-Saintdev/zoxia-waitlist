/**
 * ZOXIA Cloudflare Worker — Universal Email Dispatcher (Resend + Mailjet)
 * Supports Resend (recommended, 3000 free/mo) and Mailjet
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const emailConfig = getEmailConfig(env);

    // 1. Live Diagnostic Test Endpoint: GET /api/test-email?to=user@gmail.com
    if (url.pathname === '/api/test-email') {
      const recipient = url.searchParams.get('to') || 'test@example.com';
      const testResult = await executeEmailSend(emailConfig, recipient);
      return new Response(JSON.stringify(testResult, null, 2), {
        status: testResult.ok ? 200 : 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 2. Health Check: GET /api/health
    if (url.pathname === '/api/health') {
      const availableKeys = env ? Object.keys(env) : [];
      return new Response(JSON.stringify({
        status: 'online',
        provider: emailConfig.provider,
        hasResendKey: !!emailConfig.resendApiKey,
        hasMailjetKey: !!emailConfig.mailjetApiKey,
        hasMailjetSecret: !!emailConfig.mailjetSecretKey,
        fromEmail: emailConfig.fromEmail,
        detectedKeys: availableKeys,
        timestamp: new Date().toISOString(),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 3. Waitlist Submission: POST /api/waitlist
    if (url.pathname === '/api/waitlist') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      if (request.method === 'POST') {
        return handleWaitlistSubmission(request, env, emailConfig);
      }

      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Serve Static Assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};

/**
 * Detects whether Resend or Mailjet credentials are present
 */
function getEmailConfig(env) {
  const resendApiKey = env?.RESEND_API_KEY || env?.RESEND_KEY || '';
  
  let mailjetApiKey = env?.MAILJET_API_KEY || env?.MAILJET_PUBLIC_KEY || env?.API_KEY || '';
  let mailjetSecretKey = env?.MAILJET_SECRET_KEY || env?.MAILJET_PRIVATE_KEY || env?.SECRET_KEY || '';

  if (env?.MAILJET_CREDENTIALS && env.MAILJET_CREDENTIALS.includes(':')) {
    const parts = env.MAILJET_CREDENTIALS.trim().split(':');
    mailjetApiKey = parts[0].trim();
    mailjetSecretKey = parts[1].trim();
  }

  const fromEmail = env?.SMTP_FROM || env?.RESEND_FROM || env?.MAILJET_FROM || 'onboarding@resend.dev';
  const provider = resendApiKey ? 'Resend' : (mailjetApiKey && mailjetSecretKey ? 'Mailjet' : 'None');

  return {
    provider,
    resendApiKey,
    mailjetApiKey,
    mailjetSecretKey,
    fromEmail,
  };
}

/**
 * Universal email dispatcher (supports Resend & Mailjet)
 */
async function executeEmailSend(config, recipientEmail) {
  const welcomeEmailHtml = generateWelcomeEmailHtml(recipientEmail);

  // A. Dispatch via Resend (Modern, instant 3,000 free/mo)
  if (config.resendApiKey) {
    try {
      const fromAddress = config.fromEmail.includes('@') ? `Zoxia <${config.fromEmail}>` : 'Zoxia <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipientEmail],
          subject: "You're on the Zoxia waitlist! 👀",
          html: welcomeEmailHtml,
        }),
      });

      const data = await res.json().catch(() => ({}));
      return {
        ok: res.ok,
        provider: 'Resend',
        httpStatus: res.status,
        fromEmailUsed: fromAddress,
        recipientUsed: recipientEmail,
        rawResponse: data,
      };
    } catch (err) {
      return { ok: false, provider: 'Resend', error: err.message };
    }
  }

  // B. Dispatch via Mailjet API v3.1
  if (config.mailjetApiKey && config.mailjetSecretKey) {
    try {
      const authHeader = 'Basic ' + btoa(`${config.mailjetApiKey.trim()}:${config.mailjetSecretKey.trim()}`);
      const res = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Messages: [
            {
              From: { Email: config.fromEmail, Name: 'Zoxia' },
              To: [{ Email: recipientEmail }],
              Subject: "You're on the Zoxia waitlist! 👀",
              TextPart: `You're on the Zoxia waitlist!\n\nThanks for signing up for early access to Zoxia.\n\nWe'll email you the moment your early-access spot is ready.\n\n— The Zoxia Team\nZoxia by Cresco Ai LTD · https://zoxia.site`,
              HTMLPart: welcomeEmailHtml,
            }
          ]
        }),
      });

      const data = await res.json().catch(() => ({}));
      const msgStatus = data?.Messages?.[0]?.Status;
      return {
        ok: res.ok && msgStatus === 'success',
        provider: 'Mailjet',
        httpStatus: res.status,
        messageStatus: msgStatus || 'unknown',
        fromEmailUsed: config.fromEmail,
        recipientUsed: recipientEmail,
        rawResponse: data,
      };
    } catch (err) {
      return { ok: false, provider: 'Mailjet', error: err.message };
    }
  }

  return {
    ok: false,
    error: 'No valid email provider credentials configured in Cloudflare (add RESEND_API_KEY or unblock Mailjet)',
    config,
  };
}

/**
 * Handles waitlist form submission
 */
async function handleWaitlistSubmission(request, env, config) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = await request.json();
    const email = body.email ? body.email.trim().toLowerCase() : '';
    const role = body.role || 'Unspecified';
    const source = body.source || 'hero';
    const submittedAt = body.submittedAt || new Date().toISOString();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Persist to KV if present
    if (env && env.WAITLIST_KV) {
      try {
        const clientIp = request.headers.get('CF-Connecting-IP') || '';
        const country = request.headers.get('CF-IPCountry') || '';
        await env.WAITLIST_KV.put(`waitlist:${email}`, JSON.stringify({
          email, role, source, submittedAt, ip: clientIp, country,
        }));
      } catch (e) {}
    }

    // Execute Email Send
    const sendResult = await executeEmailSend(config, email);

    return new Response(JSON.stringify({
      success: true,
      emailSent: sendResult.ok,
      result: sendResult,
      message: "You're on the list. 👀",
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to process waitlist request: ' + err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

/**
 * Zoxia Welcome Email HTML Template
 */
function generateWelcomeEmailHtml(userEmail) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the Zoxia waitlist!</title>
</head>
<body style="margin:0;padding:0;background-color:#08090A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#FAFAF7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090A;padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#111317;border-radius:16px;padding:40px 32px;border:1px solid rgba(255,255,255,0.08);box-shadow:0 24px 60px rgba(0,0,0,0.6);">
          <tr>
            <td align="left" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:22px;font-weight:900;letter-spacing:1px;color:#FAFAF7;">ZOXIA</div>
                    <div style="font-size:11px;font-weight:600;letter-spacing:0.8px;color:#9CA0A7;margin-top:2px;">by Cresco Ai LTD</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:18px;">
              <h1 style="font-size:26px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;color:#FAFAF7;margin:0;">
                You're on the list. 👀
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;">
              <p style="font-size:15px;line-height:1.6;color:#9CA0A7;margin:0 0 16px 0;">
                Thanks for requesting early access to <strong>Zoxia</strong>.
              </p>
              <p style="font-size:15px;line-height:1.6;color:#9CA0A7;margin:0 0 16px 0;">
                Zoxia is currently being built and tested with an early group of creators and businesses to make content scheduling and performance intelligence seamless.
              </p>
              <p style="font-size:15px;line-height:1.6;color:#9CA0A7;margin:0;">
                We'll let you know when your early-access spot is ready for <span style="color:#FAFAF7;font-weight:600;">${userEmail}</span>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px;background-color:rgba(0,0,0,0.4);border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
              <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#EB7600;margin-bottom:4px;">THE ZOXIA WORKFLOW</div>
              <div style="font-size:12px;font-weight:700;color:#FAFAF7;letter-spacing:0.5px;">
                CREATE → SCHEDULE → PUBLISH → MEASURE → LEARN → CREATE BETTER
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-top:32px;border-top:1px solid rgba(255,255,255,0.06);margin-top:28px;">
              <p style="font-size:12px;line-height:18px;color:#62666E;margin:0;text-align:center;">
                Zoxia by Cresco Ai LTD · <a href="https://zoxia.site" style="color:#EB7600;text-decoration:none;">zoxia.site</a><br>
                You received this because you signed up for the Zoxia waitlist.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
