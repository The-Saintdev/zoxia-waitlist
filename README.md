# ZOXIA Pre-Launch Waitlist Landing Page

> **Product**: ZOXIA  
> **Parent Company**: Cresco Ai LTD  
> **Production Domain**: [https://zoxia.site](https://zoxia.site)  
> **Hosting**: Cloudflare Workers, free tier

---

## 🚀 Overview

This is the independent pre-launch landing page for **ZOXIA**, built to convert visitors into early-access waitlist signups with a zero-maintenance, serverless architecture.

### Key Highlights
- **Zero Backend Maintenance**: Static pages plus one small Worker (`worker.js`) for the API.
- **Brand Consistency**: Adheres to the exact Zoxia visual tokens (`#0B0D0F` dark canvas, `#EB7600` warm amber accent, clean glassmorphism, responsive typography).
- **Conversion-Optimized**: Single-input email signup above the fold, real-time client validation, loading state, duplicate prevention, and optional non-blocking secondary category survey.
- **Analytics Ready**: Centralized `trackEvent` abstraction dispatching custom events (`page_view`, `form_started`, `form_submitted`, `signup_success`, `signup_failure`).
- **Lighthouse 100 Performance**: Ultra-lightweight vanilla HTML5/CSS3/ES6 with zero external JavaScript frameworks.

---

## 🛠️ How to Run Locally

You can run this project using any local HTTP server:

```bash
# Option 1: Using Python
cd c:\Users\Hp\Desktop\zoxia-waitlist
python -m http.server 8080

# Option 2: Using Node / npx serve
npx serve .

# Option 3: Using VS Code Live Server extension
# Right click index.html -> "Open with Live Server"
```

Open `http://localhost:8080` in your browser.

---

## ☁️ How it deploys

zoxia.site is a **Cloudflare Worker** named `zoxia-waitlist` (not a Pages project), connected to this repository through Workers Builds. A push to `main` builds and deploys it.

- `worker.js` handles every `/api/*` route. Everything else is served from `public/`.
- `public/` is output. Edit the files at the root and run `npm run build` to copy them in, then commit both.
- `wrangler.json` declares the `WAITLIST_KV` binding. Any binding added in the dashboard must also be added here, or the next deploy removes it.
- Secrets (`RESEND_API_KEY`, and `PAYSTACK_SECRET_KEY` if the founding card is switched on) live in the dashboard and survive deploys.

To deploy by hand: `npx wrangler login` once, then `npm run deploy`.

---

## 📁 Project Structure

```
zoxia-waitlist/
├── assets/
│   └── logo.png             # Zoxia brand emblem logo
├── public/                # Build output, served by the Worker
├── shared/                # Code the Worker imports
├── worker.js              # Every /api route
├── build.mjs              # Copies the root files into public/
├── index.html               # Semantic HTML5 landing page & meta tags
├── styles.css               # Design tokens, glassmorphism & responsive CSS
├── app.js                   # Form handling, validation & analytics dispatcher
└── README.md                # Documentation & deployment guide
```
