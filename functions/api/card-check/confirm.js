/**
 * Confirming the card check, as a Pages Function.
 *
 * Shim over `shared/card-check.js`, same reason as its sibling.
 */
import { handleCardConfirm, preflight } from '../../../shared/card-check.js';

export async function onRequestPost(context) {
  return handleCardConfirm(context.request, context.env);
}

export async function onRequestOptions() {
  return preflight();
}
