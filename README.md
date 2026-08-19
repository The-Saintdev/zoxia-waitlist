# ZOXIA Pre-Launch Waitlist Landing Page

> **Product**: ZOXIA  
> **Parent Company**: Cresco Ai LTD  
> **Production Domain**: [https://zoxia.site](https://zoxia.site)  
> **Hosting**: 100% Free on Cloudflare Pages (or GitHub Pages / Netlify / Vercel)

---

## 🚀 Overview

This is the independent pre-launch landing page for **ZOXIA**, built to convert visitors into early-access waitlist signups with a zero-maintenance, serverless architecture.

### Key Highlights
- **Zero Backend Maintenance**: Runs completely static with optional Cloudflare Pages edge functions (`/functions/api/waitlist.js`).
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

## ☁️ How to Deploy for Free (Cloudflare Pages)

1. Push this folder to a GitHub repository (e.g. `github.com/your-username/zoxia-waitlist`).
2. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Select the repository.
4. **Build settings**:
   - **Framework preset**: `None`
   - **Build command**: *(Leave blank)*
   - **Build output directory**: `/` (or root)
5. Click **Save and Deploy**.
6. Cloudflare generates a free `*.pages.dev` URL instantly.

---

## 🌐 Connecting Custom Domain (`https://zoxia.site`)

1. In your Cloudflare Pages project, go to **Custom domains** tab.
2. Click **Set up a custom domain**.
3. Enter `zoxia.site`.
4. If your domain is managed in Cloudflare DNS, Cloudflare will automatically configure the required `CNAME` record.
5. SSL/TLS is provisioned automatically with free Let's Encrypt certificates.
6. Confirm both `https://zoxia.site` and `https://www.zoxia.site` resolve.

---

## 📁 Project Structure

```
zoxia-waitlist/
├── assets/
│   └── logo.png             # Zoxia brand emblem logo
├── functions/               # Cloudflare Pages Serverless Edge Functions
│   └── api/
│       └── waitlist.js      # Serverless handler for POST /api/waitlist
├── index.html               # Semantic HTML5 landing page & meta tags
├── styles.css               # Design tokens, glassmorphism & responsive CSS
├── app.js                   # Form handling, validation & analytics dispatcher
└── README.md                # Documentation & deployment guide
```
