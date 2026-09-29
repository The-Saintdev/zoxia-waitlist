/**
 * The card check, in one place.
 *
 * Shared because this repo has two entry points - worker.js and
 * functions/api/ - and which one is deployed is not obvious from the tree:
 * wrangler.json names the Worker, the README describes Pages Functions, and
 * they already disagree about the KV key prefix. Two copies of Paystack
 * handling would be the same drift again, one version deeper.
 */
/* ==========================================================================
   Card check
   ========================================================================== */

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export function preflight() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export function methodNotAllowed() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: JSON_HEADERS,
  });
}

/** What the check costs, in kobo. Under Paystack's fee waiver at ₦2,500. */
const CARD_CHECK_KOBO = 100 * 100;

/**
 * Start the check.
 *
 * Paystack's ordinary checkout, so the authorization that comes back is the
 * same shape the main app already charges for renewals. A founding member can
 * be billed at launch without being asked for a card again.
 */
export async function handleCardCheck(request, env) {
  try {
    const body = await request.json();
    const email = body.email ? String(body.email).trim().toLowerCase() : '';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const secret = env?.PAYSTACK_SECRET_KEY;
    if (!secret) {
      // Said plainly rather than pretending. The signup already succeeded, so
      // the page can tell them they are on the list and nothing was charged.
      return new Response(JSON.stringify({ unavailable: true }), {
        status: 200,
        headers: JSON_HEADERS,
      });
    }

    const reference = `wl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: CARD_CHECK_KOBO,
        currency: 'NGN',
        reference,
        callback_url: 'https://zoxia.site/?card=1',
        metadata: { kind: 'waitlist_card_check', email },
      }),
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok || !payload?.status || !payload?.data?.authorization_url) {
      console.error('[Card check] Paystack refused:', res.status, JSON.stringify(payload));
      return new Response(JSON.stringify({ error: 'Could not start the card check. Nothing was charged.' }), {
        status: 502,
        headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify({
      authorizationUrl: payload.data.authorization_url,
      reference,
    }), { status: 200, headers: JSON_HEADERS });

  } catch (err) {
    console.error('[Card check] Error:', err);
    return new Response(JSON.stringify({ error: 'Could not start the card check. Nothing was charged.' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}

/**
 * Confirm it, and keep the authorization.
 *
 * Asks Paystack what happened rather than trusting the browser that came
 * back. A reference in a URL is a claim, not a payment.
 *
 * No card number, expiry or CVV is stored, here or anywhere. Paystack holds
 * those. What lands in KV is an authorization code, which is worthless to
 * anyone else and is what lets us charge the card at launch.
 */
export async function handleCardConfirm(request, env) {
  try {
    const body = await request.json();
    const reference = body.reference ? String(body.reference).trim().slice(0, 128) : '';

    if (!reference) {
      return new Response(JSON.stringify({ verified: false }), { status: 200, headers: JSON_HEADERS });
    }

    const secret = env?.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return new Response(JSON.stringify({ verified: false }), { status: 200, headers: JSON_HEADERS });
    }

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret.trim()}` },
    });

    const payload = await res.json().catch(() => null);
    const data = payload?.data;

    if (!res.ok || data?.status !== 'success') {
      return new Response(JSON.stringify({ verified: false }), { status: 200, headers: JSON_HEADERS });
    }

    const email = (data.metadata?.email || data.customer?.email || '').toLowerCase();
    const auth = data.authorization || {};

    if (email && env?.WAITLIST_KV) {
      // Merged, for the same reason every other write here is: this arrives
      // after the answers and must not erase them.
      let existing = {};
      try {
        const prior = await env.WAITLIST_KV.get(`signee:${email}`);
        if (prior) existing = JSON.parse(prior);
      } catch (e) {
        existing = {};
      }

      await env.WAITLIST_KV.put(`signee:${email}`, JSON.stringify({
        ...existing,
        email,
        cardAuthorization: auth.authorization_code || '',
        cardLast4: auth.last4 || '',
        cardBank: auth.bank || '',
        cardVerifiedAt: new Date().toISOString(),
        foundingMember: true,
        updatedAt: new Date().toISOString(),
      }));
    }

    if (env?.WAITLIST_WEBHOOK_URL) {
      fetch(env.WAITLIST_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `💳 **Founding member!**\n**Email**: \`${email}\`\n**Card**: ${auth.brand || 'card'} ending ${auth.last4 || '????'}`,
        }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ verified: true, last4: auth.last4 || null }), {
      status: 200,
      headers: JSON_HEADERS,
    });

  } catch (err) {
    console.error('[Card confirm] Error:', err);
    return new Response(JSON.stringify({ verified: false }), { status: 200, headers: JSON_HEADERS });
  }
}
