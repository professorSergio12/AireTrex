/*
 * Reads RFQ context from the URL query string.
 * Supports:
 *   - Multi-item vendor link: item_ids, products, quantities, units (pipe-separated)
 *   - Legacy single-item link: item_id, product, qty, unit
 */
function splitPipe(value) {
  if (!value) return [];
  return String(value).split("|");
}

function buildItemsFromPipes(p) {
  const ids = splitPipe(p.get("item_ids"));
  const products = splitPipe(p.get("products"));
  const quantities = splitPipe(p.get("quantities"));
  const units = splitPipe(p.get("units"));
  const count = Math.max(ids.length, products.length, quantities.length, units.length);
  if (!count) return [];

  const items = [];
  for (let i = 0; i < count; i += 1) {
    const itemId = (ids[i] || "").trim();
    const product = (products[i] || "").trim();
    const quantity = (quantities[i] || "").trim();
    const unit = (units[i] || "").trim();
    if (!itemId && !product) continue;
    items.push({ itemId, product, quantity, unit });
  }
  return items;
}

export function getRfqParams() {
  const p = new URLSearchParams(window.location.search);
  const get = (k) => (p.get(k) || "").trim();

  const items = buildItemsFromPipes(p);
  const first = items[0] || null;

  return {
    uid: get("uid"),
    rfqNumber: get("rfq_no"),
    rfqRecordId: get("rfq_rid"),
    vendorId: get("vendor_id"),
    vendorRecordId: get("vendor_rid"),
    vendorName: get("vendor_name"),
    email: get("email"),
    // Multi-item array (vendor-level link)
    items,
    // Legacy single-item fields (backward compatible)
    itemId: first?.itemId || get("item_id"),
    product: first?.product || get("product"),
    quantity: first?.quantity || get("qty") || get("quantity"),
    unit: first?.unit || get("unit"),
    brand: get("brand"),
    spec: get("spec"),
  };
}

// Vendor-level uid: <RFQ_Number>_<Vendor_Record_ID>
// Legacy per-item uid: <RFQ_Number>_<Item_ID>_<Vendor_Code>
export function resolveUid(params) {
  if (params.uid) return params.uid;
  if (params.rfqNumber && params.vendorRecordId) {
    return `${params.rfqNumber}_${params.vendorRecordId}`;
  }
  if (params.rfqNumber && params.itemId && params.vendorId) {
    return `${params.rfqNumber}_${params.itemId}_${params.vendorId}`;
  }
  return "";
}

export function resolveLineItems(params) {
  if (Array.isArray(params.items) && params.items.length) {
    return params.items;
  }
  if (params.itemId || params.product) {
    return [
      {
        itemId: params.itemId,
        product: params.product,
        quantity: params.quantity,
        unit: params.unit,
      },
    ];
  }
  return [];
}
