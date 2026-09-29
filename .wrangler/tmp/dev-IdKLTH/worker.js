var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-6SvXNv/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-6SvXNv/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// worker.js
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const emailConfig = getEmailConfig(env);
    if (url.pathname === "/api/signees") {
      const adminSecret = env?.ADMIN_SECRET || env?.ADMIN_KEY || "zoxia2026";
      const providedSecret = url.searchParams.get("secret") || request.headers.get("x-admin-secret");
      if (providedSecret !== adminSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized. Please provide valid ?secret= parameter." }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      const format = url.searchParams.get("format") || "json";
      return handleListSignees(env, format);
    }
    if (url.pathname === "/api/waitlist") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          }
        });
      }
      if (request.method === "POST") {
        return handleWaitlistSubmission(request, env, emailConfig);
      }
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not found", { status: 404 });
  }
};
function getEmailConfig(env) {
  const resendApiKey = env?.RESEND_API_KEY || env?.RESEND_KEY || "";
  const resendAudienceId = env?.RESEND_AUDIENCE_ID || "";
  let mailjetApiKey = env?.MAILJET_API_KEY || env?.MAILJET_PUBLIC_KEY || env?.API_KEY || "";
  let mailjetSecretKey = env?.MAILJET_SECRET_KEY || env?.MAILJET_PRIVATE_KEY || env?.SECRET_KEY || "";
  if (env?.MAILJET_CREDENTIALS && env.MAILJET_CREDENTIALS.includes(":")) {
    const parts = env.MAILJET_CREDENTIALS.trim().split(":");
    mailjetApiKey = parts[0].trim();
    mailjetSecretKey = parts[1].trim();
  }
  const fromEmail = env?.SMTP_FROM || env?.RESEND_FROM || env?.MAILJET_FROM || "noreply@zoxia.site";
  const provider = resendApiKey ? "Resend" : mailjetApiKey && mailjetSecretKey ? "Mailjet" : "None";
  return {
    provider,
    resendApiKey,
    resendAudienceId,
    mailjetApiKey,
    mailjetSecretKey,
    fromEmail
  };
}
__name(getEmailConfig, "getEmailConfig");
async function handleWaitlistSubmission(request, env, config) {
  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };
  try {
    const body = await request.json();
    const name = body.name ? body.name.trim() : "";
    const email = body.email ? body.email.trim().toLowerCase() : "";
    const role = body.role || "";
    const source = body.source || "hero";
    const submittedAt = body.submittedAt || (/* @__PURE__ */ new Date()).toISOString();
    const everLostAPost = body.everLostAPost ? String(body.everLostAPost).trim().slice(0, 600) : "";
    const proofForBrands = body.proofForBrands ? String(body.proofForBrands).trim().slice(0, 600) : "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Please enter a valid email address." }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const clientIp = request.headers.get("CF-Connecting-IP") || "";
    const country = request.headers.get("CF-IPCountry") || "";
    if (env && env.WAITLIST_KV) {
      try {
        let existing = {};
        try {
          const prior = await env.WAITLIST_KV.get(`signee:${email}`);
          if (prior)
            existing = JSON.parse(prior);
        } catch (e) {
          existing = {};
        }
        const signeeRecord = {
          ...existing,
          email,
          name: name || existing.name || "Creator",
          role: role || existing.role || "Unspecified",
          source: existing.source || source,
          submittedAt: existing.submittedAt || submittedAt,
          ip: clientIp || existing.ip || "",
          country: country || existing.country || "",
          everLostAPost: everLostAPost || existing.everLostAPost || "",
          proofForBrands: proofForBrands || existing.proofForBrands || "",
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await env.WAITLIST_KV.put(`signee:${email}`, JSON.stringify(signeeRecord));
        let indexList = [];
        const existingIndex = await env.WAITLIST_KV.get("__signees_index__");
        if (existingIndex) {
          try {
            indexList = JSON.parse(existingIndex);
          } catch (e) {
          }
        }
        if (!indexList.includes(email)) {
          indexList.unshift(email);
          await env.WAITLIST_KV.put("__signees_index__", JSON.stringify(indexList));
        }
      } catch (kvErr) {
        console.error("[KV Logging Error]:", kvErr);
      }
    }
    if (config.resendApiKey && config.resendAudienceId) {
      fetch(`https://api.resend.com/audiences/${config.resendAudienceId}/contacts`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.resendApiKey.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          first_name: name || void 0,
          unsubscribed: false
        })
      }).catch((e) => console.warn("[Resend Audience Sync]:", e.message));
    }
    if (env && env.WAITLIST_WEBHOOK_URL) {
      fetch(env.WAITLIST_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `\u{1F389} **New Zoxia Signee!**
**Name**: ${name || "N/A"}
**Email**: \`${email}\`
**Role**: ${role}
**Country**: ${country || "N/A"}
**Time**: ${(/* @__PURE__ */ new Date()).toLocaleString()}`
        })
      }).catch(() => {
      });
    }
    const sendResult = await executeEmailSend(config, email, name);
    return new Response(JSON.stringify({
      success: true,
      emailSent: sendResult.ok,
      message: "You're on the list. \u{1F440}"
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to process waitlist request: " + err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
__name(handleWaitlistSubmission, "handleWaitlistSubmission");
async function executeEmailSend(config, recipientEmail, recipientName) {
  const welcomeEmailHtml = generateWelcomeEmailHtml(recipientEmail, recipientName);
  if (config.resendApiKey) {
    try {
      const fromAddress = config.fromEmail.includes("<") ? config.fromEmail : `Zoxia <${config.fromEmail}>`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.resendApiKey.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipientEmail],
          subject: "You're on the Zoxia waitlist! \u{1F440}",
          html: welcomeEmailHtml
        })
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, provider: "Resend", rawResponse: data };
    } catch (err) {
      return { ok: false, provider: "Resend", error: err.message };
    }
  }
  if (config.mailjetApiKey && config.mailjetSecretKey) {
    try {
      const authHeader = "Basic " + btoa(`${config.mailjetApiKey.trim()}:${config.mailjetSecretKey.trim()}`);
      const res = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          Messages: [
            {
              From: { Email: config.fromEmail, Name: "Zoxia" },
              To: [{ Email: recipientEmail, Name: recipientName || void 0 }],
              Subject: "You're on the Zoxia waitlist! \u{1F440}",
              TextPart: `Hi ${recipientName || "there"},

You're on the Zoxia waitlist!

Thanks for signing up for early access.

\u2014 The Zoxia Team
Zoxia by Cresco Ai LTD \xB7 https://zoxia.site`,
              HTMLPart: welcomeEmailHtml
            }
          ]
        })
      });
      const data = await res.json().catch(() => ({}));
      const msgStatus = data?.Messages?.[0]?.Status;
      return {
        ok: res.ok && msgStatus === "success",
        provider: "Mailjet",
        rawResponse: data
      };
    } catch (err) {
      return { ok: false, provider: "Mailjet", error: err.message };
    }
  }
  return { ok: false, error: "No email credentials configured" };
}
__name(executeEmailSend, "executeEmailSend");
async function handleListSignees(env, format) {
  if (!env || !env.WAITLIST_KV) {
    return new Response(JSON.stringify({
      message: "Cloudflare KV (WAITLIST_KV) is not bound. Bind WAITLIST_KV in Cloudflare Dashboard to enable database storage.",
      signees: []
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const rawIndex = await env.WAITLIST_KV.get("__signees_index__");
    const emailList = rawIndex ? JSON.parse(rawIndex) : [];
    const signees = [];
    for (const email of emailList) {
      const record = await env.WAITLIST_KV.get(`signee:${email}`);
      if (record) {
        try {
          signees.push(JSON.parse(record));
        } catch (e) {
        }
      }
    }
    if (format === "csv") {
      const csvRows = ["Name,Email,Role,Source,Country,SubmittedAt"];
      signees.forEach((s) => {
        csvRows.push(`"${s.name || ""}","${s.email}","${s.role || ""}","${s.source || ""}","${s.country || ""}","${s.submittedAt || ""}"`);
      });
      return new Response(csvRows.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="zoxia-waitlist-signees.csv"'
        }
      });
    }
    return new Response(JSON.stringify({
      total: signees.length,
      signees
    }, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to retrieve signees: " + err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleListSignees, "handleListSignees");
function generateWelcomeEmailHtml(userEmail, userName) {
  const greetingName = userName ? `, ${userName}` : "";
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
                You're on the list. \u{1F440}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;">
              <p style="font-size:15px;line-height:1.6;color:#9CA0A7;margin:0 0 16px 0;">
                Hi${greetingName}, thanks for requesting early access to <strong>Zoxia</strong>.
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
                CREATE \u2192 SCHEDULE \u2192 PUBLISH \u2192 MEASURE \u2192 LEARN \u2192 CREATE BETTER
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-top:32px;border-top:1px solid rgba(255,255,255,0.06);margin-top:28px;">
              <p style="font-size:12px;line-height:18px;color:#62666E;margin:0;text-align:center;">
                Zoxia by Cresco Ai LTD \xB7 <a href="https://zoxia.site" style="color:#EB7600;text-decoration:none;">zoxia.site</a><br>
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
__name(generateWelcomeEmailHtml, "generateWelcomeEmailHtml");

// ../../AppData/Local/npm-cache/_npx/0eedb5afd4158ff3/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../AppData/Local/npm-cache/_npx/0eedb5afd4158ff3/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-6SvXNv/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../AppData/Local/npm-cache/_npx/0eedb5afd4158ff3/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-6SvXNv/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
