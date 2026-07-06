/*
 * Reads the prefilled RFQ context from the URL query string.
 * These are the params the Deluge `sendRFQToVendors` function embeds in the
 * link it emails to each vendor.
 */
export function getRfqParams() {
  const p = new URLSearchParams(window.location.search);
  const get = (k) => (p.get(k) || "").trim();

  return {
    // Unique correlation id: <RFQ_Number>_<Item_ID>_<Vendor_Code>
    uid: get("uid"),
    rfqNumber: get("rfq_no"),
    itemId: get("item_id"),
    vendorId: get("vendor_id"),
    vendorName: get("vendor_name"),
    product: get("product"),
    quantity: get("qty"),
    unit: get("unit"),
    brand: get("brand"),
    spec: get("spec"),
    email: get("email"),
  };
}

// If uid wasn't passed explicitly, derive it from the individual params.
export function resolveUid(params) {
  if (params.uid) return params.uid;
  if (params.rfqNumber && params.itemId && params.vendorId) {
    return `${params.rfqNumber}_${params.itemId}_${params.vendorId}`;
  }
  return "";
}
