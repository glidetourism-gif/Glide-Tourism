// Glide Tourism: same-origin Vercel -> Google Apps Script API proxy.
// Deploy this file at: api/glide-api.mjs in the Vercel project root.
// The website sends POST to /api/glide-api.

// Current Glide Tourism /exec endpoint observed in the browser's console on 14 Nov 2026.
// If you create a new Google deployment, update this constant to its NEW /exec URL.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbymkCXmVzYgcaqQirO6lvLNTvllHrZlXb4Z2lW0XTB3HuRiQmXRFbsyFrf6RgJbhO7a6Q/exec';

const ACTIONS = new Set([
  'login', 'getQuoteSequenceInfo', 'fetchQuoteByParts', 'generateQuote',
  'generateAdvanceReceipt', 'fetchInvoiceContextByParts',
  'generateFinalInvoice', 'generateDriverAssignment', 'fetchAssignContextByParts'
]);

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

async function handler(request) {
  if (request.method !== 'POST') {
    return json({ status: 'error', message: 'POST required.' }, 405);
  }

  // Reject cross-site browser requests; this function is meant for our own website.
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return json({ status: 'error', message: 'Cross-origin request rejected.' }, 403);
  }

  let payload;
  try {
    const raw = await request.text();
    if (raw.length > 250000) return json({ status: 'error', message: 'Request too large.' }, 413);
    payload = JSON.parse(raw);
    if (!payload || !ACTIONS.has(payload.action) || !Array.isArray(payload.args)) {
      return json({ status: 'error', message: 'Unsupported API request.' }, 400);
    }
  } catch {
    return json({ status: 'error', message: 'Invalid JSON request.' }, 400);
  }

  try {
    // ContentService returns a Google redirect. Server-side fetch can follow it;
    // the browser never makes a cross-origin request.
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45000)
    });

    if (!response.ok) {
      return json({
        status: 'error',
        message: `Google Apps Script returned HTTP ${response.status}. Check deployment access and Apps Script executions.`
      }, 502);
    }

    let body;
    try { body = await response.json(); }
    catch {
      return json({
        status: 'error',
        message: 'Apps Script did not return JSON. Confirm Web app access = Anyone, Execute as = Me, and that the URL points to the current deployed version.'
      }, 502);
    }

    if (!body || !['success', 'error'].includes(body.status)) {
      return json({ status: 'error', message: 'Unexpected Apps Script response.' }, 502);
    }
    return json(body);
  } catch (err) {
    // Never automatically repeat POST/save operations: the server may already
    // have written to Sheets/Drive even if Google's response failed.
    const timeout = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return json({
      status: 'error',
      message: timeout
        ? 'Google Apps Script response timed out. Check the Google Sheet before retrying Save.'
        : 'Cannot reach Google Apps Script. Check the deployment and hosting function logs.'
    }, 502);
  }
}

// Vercel Node.js Web Standard entry point.
export default { fetch: handler };
