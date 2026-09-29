/**
 * The card check, as a Pages Function.
 *
 * A thin shim. The logic lives in `shared/card-check.js` because this repo
 * has two entry points and which one is deployed is not obvious from the
 * tree: `wrangler.json` names the Worker, the README describes Pages
 * Functions, and the two waitlist handlers already disagree about the KV key
 * prefix. Whichever is live, this behaves the same.
 */
import { handleCardCheck, preflight } from '../../shared/card-check.js';

export async function onRequestPost(context) {
  return handleCardCheck(context.request, context.env);
}

export async function onRequestOptions() {
  return preflight();
}
