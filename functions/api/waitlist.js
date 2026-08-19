/**
 * ZOXIA Waitlist — Cloudflare Pages Functions Handler
 * Integrates with Mailjet Send API v3.1
 */

export async function onRequestPost(context) {
  const { request, env } = context;

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
    const source = body.source || 'hero';
    const submittedAt = body.submittedAt || new Date().toISOString();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (env && env.WAITLIST_KV) {
      try {
        const clientIp = request.headers.get('CF-Connecting-IP') || '';
        const country = request.headers.get('CF-IPCountry') || '';
        await env.WAITLIST_KV.put(`waitlist:${email}`, JSON.stringify({
          email,
          role,
          source,
          submittedAt,
          ip: clientIp,
          country,
        }));
      } catch (kvErr) {
        console.error('[KV Error]:', kvErr);
      }
    }

    let emailSent = false;
    let mailjetDebug = null;

    const mailjetApiKey = env?.MAILJET_API_KEY || env?.MAILJET_PUBLIC_KEY || env?.MAILJET_KEY || env?.MJ_APIKEY_PUBLIC || env?.API_KEY;
    const mailjetSecretKey = env?.MAILJET_SECRET_KEY || env?.MAILJET_PRIVATE_KEY || env?.MAILJET_SECRET || env?.MJ_APIKEY_PRIVATE || env?.SECRET_KEY;
    const fromEmail = env?.SMTP_FROM || env?.MAILJET_FROM || env?.MAILJET_SENDER || env?.SENDER_EMAIL || 'noreply@zoxia.site';
    const fromName = 'Zoxia';

    if (mailjetApiKey && mailjetSecretKey) {
      const welcomeEmailHtml = generateWelcomeEmailHtml(email);
      const authHeader = 'Basic ' + btoa(`${mailjetApiKey.trim()}:${mailjetSecretKey.trim()}`);

      try {
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

        const resText = await mailjetRes.text();
        if (mailjetRes.ok) {
          emailSent = true;
          mailjetDebug = 'Delivered to Mailjet queue';
        } else {
          console.error('[Mailjet API Error]:', mailjetRes.status, resText);
          mailjetDebug = `Mailjet returned status ${mailjetRes.status}: ${resText}`;
        }
      } catch (fetchErr) {
        console.error('[Mailjet Fetch Exception]:', fetchErr);
        mailjetDebug = `Mailjet fetch error: ${fetchErr.message}`;
      }
    } else {
      mailjetDebug = 'MAILJET_API_KEY or MAILJET_SECRET_KEY missing in Cloudflare environment variables';
      console.warn('[Zoxia Worker]:', mailjetDebug);
    }

    if (env && env.WAITLIST_WEBHOOK_URL) {
      await fetch(env.WAITLIST_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🎉 **New Zoxia Waitlist Signup!**\n**Email**: \`${email}\`\n**Role**: \`${role}\`\n**Mailjet Status**: \`${emailSent ? 'Sent' : 'Failed (' + mailjetDebug + ')'}\``,
        }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({
      success: true,
      emailSent,
      mailjetDebug,
      message: "You're on the list. 👀",
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err) {
    console.error('[Worker Error]:', err);
    return new Response(JSON.stringify({ error: 'Failed to process waitlist request: ' + err.message }), {
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

function generateWelcomeEmailHtml(userEmail) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the Zoxia waitlist!</title>
</head>
<body style="margin:0;padding:0;background-color:#08090A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#FAFAF7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090A;padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#111317;border-radius:16px;padding:40px 32px;border:1px solid rgba(255,255,255,0.08);box-shadow:0 24px 60px rgba(0,0,0,0.6);">
          
          <!-- Logo & Brand Header -->
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

          <!-- Heading -->
          <tr>
            <td style="padding-bottom:18px;">
              <h1 style="font-size:26px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;color:#FAFAF7;margin:0;">
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
                Zoxia is currently being built and tested with an early group of creators and businesses to make content scheduling and performance intelligence seamless.
              </p>
              <p style="font-size:15px;line-height:1.6;color:#9CA0A7;margin:0;">
                We'll let you know when your early-access spot is ready for <span style="color:#FAFAF7;font-weight:600;">${userEmail}</span>.
              </p>
            </td>
          </tr>

          <!-- Workflow Loop -->
          <tr>
            <td style="padding:18px;background-color:rgba(0,0,0,0.4);border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
              <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#EB7600;margin-bottom:4px;">THE ZOXIA WORKFLOW</div>
              <div style="font-size:12px;font-weight:700;color:#FAFAF7;letter-spacing:0.5px;">
                CREATE → SCHEDULE → PUBLISH → MEASURE → LEARN → CREATE BETTER
              </div>
            </td>
          </tr>

          <!-- Footer -->
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
