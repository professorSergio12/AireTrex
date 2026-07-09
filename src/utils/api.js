import { CONFIG } from "../config";

/*
 * Submits vendor quotation to quotation-backend.
 * Supports per-item files: attachment_0, datasheet_0, attachment_1, ...
 */
export async function submitQuotation(payload, files = {}) {
  if (CONFIG.MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 700));
    window.__AT_SUBMISSIONS__ = window.__AT_SUBMISSIONS__ || [];
    window.__AT_SUBMISSIONS__.push({ ...payload, files });
    console.log("[MOCK] Quotation submitted:", payload, files);
    return { ok: true, uniqueId: payload.uniqueId };
  }

  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    fd.append(k, v == null ? "" : String(v));
  });
  Object.entries(files).forEach(([k, file]) => {
    if (file) fd.append(k, file);
  });

  const res = await fetch(CONFIG.BACKEND_URL, {
    method: "POST",
    body: fd,
  });

  let result = {};
  try {
    result = await res.json();
  } catch {
    /* non-JSON */
  }

  if (res.ok && result.ok) {
    if (result.uploadWarning) {
      console.warn("Quotation saved but file upload failed:", result.uploadWarning, result.uploads);
    }
    return {
      ok: true,
      uniqueId: payload.uniqueId,
      recordId: result.recordId,
      uploadWarning: result.uploadWarning || null,
    };
  }

  console.error("Submission rejected:", result);
  const detailMsg =
    Array.isArray(result.detail?.error) && result.detail.error.length
      ? result.detail.error.join("; ")
      : result.detail?.message || result.detail?.description || "";
  throw new Error(detailMsg || result.message || `Submit failed (HTTP ${res.status}).`);
}
