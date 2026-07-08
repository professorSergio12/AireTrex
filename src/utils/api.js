import { CONFIG } from "../config";

/*
 * Submits the vendor's quotation to the quotation-backend proxy, which forwards
 * it into the Zoho Creator "Vendor Quotations" module (Add Records v2.1).
 *
 * We send flat fields (not the Creator payload) so the OAuth token and the
 * exact Creator field mapping stay server-side. The record is correlated to the
 * originating deal + item + vendor via rfqNumber + vendorId + itemId (uniqueId).
 *
 * Attachment / Datasheet files (when supplied) are sent as multipart/form-data
 * so the backend can push them into the Quotation_Items subform file fields.
 *
 * Returns { ok: true, uniqueId, recordId } on success or throws on failure.
 */
export async function submitQuotation(payload, files = {}) {
  if (CONFIG.MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 700));
    window.__AT_SUBMISSIONS__ = window.__AT_SUBMISSIONS__ || [];
    window.__AT_SUBMISSIONS__.push({ ...payload, files });
    console.log("[MOCK] Quotation submitted:", payload, files);
    return { ok: true, uniqueId: payload.uniqueId };
  }

  // Build multipart form data: flat text fields + optional files. Sending
  // FormData lets the browser set the multipart boundary Content-Type header.
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    fd.append(k, v == null ? "" : String(v));
  });
  if (files.attachment) fd.append("attachment", files.attachment);
  if (files.datasheet) fd.append("datasheet", files.datasheet);

  const res = await fetch(CONFIG.BACKEND_URL, {
    method: "POST",
    body: fd,
  });

  let result = {};
  try { result = await res.json(); } catch { /* non-JSON response */ }

  if (res.ok && result.ok) {
    return { ok: true, uniqueId: payload.uniqueId, recordId: result.recordId };
  }

  console.error("Submission rejected:", result);
  throw new Error(result.message || `Submit failed (HTTP ${res.status}).`);
}
