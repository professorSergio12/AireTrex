import { CONFIG } from "../config";

/*
 * Submits a vendor quotation.
 *
 * The payload always carries `uniqueId` (uid) so Zoho Creator can match the
 * quote to the exact deal + item + vendor the RFQ was sent for.
 *
 * Returns { ok: true, uniqueId } on success or throws on failure.
 */
export async function submitQuotation(payload) {
  if (CONFIG.MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 700));
    // Keep a copy in-memory so it's inspectable during a demo.
    window.__AT_SUBMISSIONS__ = window.__AT_SUBMISSIONS__ || [];
    window.__AT_SUBMISSIONS__.push(payload);
    console.log("[MOCK] Quotation submitted:", payload);
    return { ok: true, uniqueId: payload.uniqueId };
  }

  const res = await fetch(CONFIG.SUBMIT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildCreatorBody(payload)),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Submit failed (${res.status}): ${text}`);
  }
  return { ok: true, uniqueId: payload.uniqueId };
}

/*
 * Maps the internal payload to a Zoho Creator "Add Records" body.
 * Adjust the field link names on the left to match your Creator Quotation form.
 */
function buildCreatorBody(p) {
  return {
    data: {
      Unique_ID: p.uniqueId,
      RFQ_Number: p.rfqNumber,
      Item_ID: p.itemId,
      Vendor_ID: p.vendorId,
      Product_Name: p.product,
      Quantity: p.quantity,
      Quote_Number: p.quoteNumber,
      Quote_Date: p.quoteDate,
      Contact_Email: p.contactEmail,
      Price: p.price,
      Currency: p.currency,
      Lead_Time: p.leadTime,
      Validity: p.validity,
      Freight: p.freight,
      GST: p.gst,
      Remarks: p.remarks,
      Status: "Received",
    },
  };
}
