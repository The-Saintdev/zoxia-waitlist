/**
 * ZOXIA Waitlist — Edge Serverless Submission & Automated Email Dispatcher
 * Integrates with Mailjet Send API v3.1
 * Endpoint: POST /api/waitlist
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await request.json();
    const email = body.email ? body.email.trim().toLowerCase() : '';
    const role = body.role || 'Unspecified';
    const source = body.source || 'hero_form';
    const submittedAt = body.submittedAt || new Date().toISOString();

    // 1. Validate email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Please provide a valid email address.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '';
    const country = request.headers.get('CF-IPCountry') || '';

    // 2. Persist to Cloudflare KV Database (if WAITLIST_KV binding is connected)
    if (env && env.WAITLIST_KV) {
      const record = {
        email,
        role,
        source,
        submittedAt,
        ip: clientIp,
        country,
      };
      await env.WAITLIST_KV.put(`waitlist:${email}`, JSON.stringify(record));
    }

    // 3. Send Automated Branded Confirmation Email via Mailjet API v3.1
    let emailSent = false;

    const mailjetApiKey = env?.MAILJET_API_KEY;
    const mailjetSecretKey = env?.MAILJET_SECRET_KEY;
    const fromEmail = env?.SMTP_FROM || env?.MAILJET_FROM || 'noreply@zoxia.site';
    const fromName = 'Zoxia';

    if (mailjetApiKey && mailjetSecretKey) {
      const welcomeEmailHtml = generateWelcomeEmailHtml(email);
      const authHeader = 'Basic ' + btoa(`${mailjetApiKey}:${mailjetSecretKey}`);

      const mailjetRes = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Messages: [
            {
              From: {
                Email: fromEmail,
                Name: fromName,
              },
              To: [
                {
                  Email: email,
                }
              ],
              Subject: "You're on the Zoxia waitlist! 👀",
              TextPart: `You're on the Zoxia waitlist!\n\nThanks for signing up for early access to Zoxia.\n\nWe're currently building and testing Zoxia with an early cohort of creators and businesses.\n\nWe'll email you the moment your early-access spot is ready.\n\n— The Zoxia Team\nZoxia by Cresco Ai LTD · https://zoxia.site`,
              HTMLPart: welcomeEmailHtml,
            }
          ]
        }),
      });

      if (mailjetRes.ok) {
        emailSent = true;
      } else {
        const errorText = await mailjetRes.text();
        console.error('[Mailjet API Error]:', mailjetRes.status, errorText);
      }
    }

    // 4. Optional: Forward to Admin Webhook (Slack / Discord / Telegram)
    if (env && env.WAITLIST_WEBHOOK_URL) {
      await fetch(env.WAITLIST_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🎉 **New Zoxia Waitlist Signup!**\n**Email**: \`${email}\`\n**Country**: \`${country || 'Unknown'}\`\n**Source**: \`${source}\``,
        }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({
      success: true,
      emailSent,
      message: "You're on the list. Check your inbox for confirmation!",
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('[Waitlist API Error]:', error);
    return new Response(JSON.stringify({ error: 'Failed to process waitlist request' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/**
 * Generates Zoxia branded HTML email template
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
<body style="margin:0;padding:0;background-color:#0B0D0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F6F5F0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0D0F;padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#121417;border-radius:20px;padding:40px 32px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 50px rgba(0,0,0,0.5);">
          
          <!-- Logo & Brand Header -->
          <tr>
            <td align="left" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:24px;font-weight:900;letter-spacing:1.5px;color:#F6F5F0;">ZOXIA</div>
                    <div style="font-size:11px;font-weight:600;letter-spacing:1px;color:#9CA0A7;margin-top:2px;">by Cresco Ai LTD</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Eyebrow Badge -->
          <tr>
            <td style="padding-bottom:12px;">
              <div style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:1px;color:#EB7600;background-color:rgba(235,118,0,0.12);padding:4px 12px;border-radius:9999px;border:1px solid rgba(235,118,0,0.25);">
                EARLY ACCESS CONFIRMED
              </div>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td style="padding-bottom:18px;">
              <h1 style="font-size:26px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;color:#F6F5F0;margin:0;">
                You're on the list. 👀
              </h1>
            </td>
          </tr>

          <!-- Body Message -->
          <tr>
            <td style="padding-bottom:24px;">
              <p style="font-size:15px;line-height:1.6;color:#9CA0A7;margin:0 0 16px 0;">
                Thanks for requesting early access to <strong>Zoxia</strong>.
              </p>
              <p style="font-size:15px;line-height:1.6;color:#9CA0A7;margin:0 0 16px 0;">
                We're currently building and testing Zoxia with an early cohort of creators, brands, and agencies to make content scheduling and performance intelligence seamless.
              </p>
              <p style="font-size:15px;line-height:1.6;color:#9CA0A7;margin:0;">
                Your spot is confirmed for <span style="color:#F6F5F0;font-weight:600;">${userEmail}</span>. We'll email you the moment your early-access invitation is ready.
              </p>
            </td>
          </tr>

          <!-- Workflow Loop Visual Snippet -->
          <tr>
            <td style="padding:20px;background-color:rgba(0,0,0,0.3);border-radius:12px;border:1px solid rgba(255,255,255,0.06);margin-bottom:24px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#EB7600;margin-bottom:6px;">THE ZOXIA WORKFLOW</div>
              <div style="font-size:13px;font-weight:600;color:#F6F5F0;line-height:1.4;">
                CREATE → SCHEDULE → PUBLISH → MEASURE → LEARN
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;border-top:1px solid rgba(255,255,255,0.06);margin-top:28px;">
              <p style="font-size:12px;line-height:18px;color:#62666E;margin:0;text-align:center;">
                Zoxia by Cresco Ai LTD · <a href="https://zoxia.site" style="color:#EB7600;text-decoration:none;">zoxia.site</a><br>
                You're receiving this because you signed up for the Zoxia pre-launch waitlist.
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
