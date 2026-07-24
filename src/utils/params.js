/*
 * Reads RFQ context from the URL query string.
 * Supports:
 *   - Multi-item vendor link: item_ids, products, quantities, units, descriptions (pipe-separated)
 *   - Legacy single-item link: item_id, product, qty, unit
 */
/**
 * Fixes "T e s t" / "B a r  b o t t o m" style text from bad URL encoding.
 * Only collapses when most space-separated tokens are single characters.
 */
export function isSpacedOutText(text) {
  const parts = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 3) return false;
  const singleChar = parts.filter((p) => p.length === 1).length;
  return singleChar / parts.length >= 0.6;
}

export function normalizeSpacedText(text) {
  const s = String(text ?? "").trim();
  if (!s || !isSpacedOutText(s)) return s;

  let out = s;
  while (/\S \S/.test(out)) {
    out = out.replace(/(\S) (\S)/g, "$1$2");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function decodePipePart(part) {
  const trimmed = (part || "").trim();
  if (!trimmed) return "";
  try {
    return decodeURIComponent(trimmed.replace(/\+/g, " "));
  } catch {
    return trimmed;
  }
}

function splitPipe(value) {
  if (!value) return [];
  return String(value).split("|").map(decodePipePart);
}

function decodeDescriptionPart(part) {
  return decodePipePart(part);
}

function buildItemsFromPipes(p) {
  const ids = splitPipe(p.get("item_ids"));
  const products = splitPipe(p.get("products"));
  const quantities = splitPipe(p.get("quantities"));
  const units = splitPipe(p.get("units"));
  const descriptions = splitPipe(p.get("descriptions")).map((part) =>
    decodeDescriptionPart(part)
  );
  const spec1s = splitPipe(p.get("spec_1s") || p.get("specs1"));
  const spec2s = splitPipe(p.get("spec_2s") || p.get("specs2"));
  const spec3s = splitPipe(p.get("spec_3s") || p.get("specs3"));
  const spec4s = splitPipe(p.get("spec_4s") || p.get("specs4"));
  const mainCategories = splitPipe(
    p.get("main_categories") || p.get("main_categorys") || p.get("main_cats")
  );
  const productTypes = splitPipe(p.get("product_types") || p.get("product_type_s"));
  const vendorRids = splitPipe(p.get("vendor_rids"));
  const vendorIds = splitPipe(p.get("vendor_ids"));
  const count = Math.max(
    ids.length,
    products.length,
    quantities.length,
    units.length,
    descriptions.length,
    spec1s.length,
    spec2s.length,
    spec3s.length,
    spec4s.length,
    mainCategories.length,
    productTypes.length,
    vendorRids.length,
    vendorIds.length
  );
  if (!count) return [];

  const items = [];
  for (let i = 0; i < count; i += 1) {
    const itemId = (ids[i] || "").trim();
    const product = (products[i] || "").trim();
    const quantity = (quantities[i] || "").trim();
    const unit = (units[i] || "").trim();
    const description = (descriptions[i] || "").trim();
    const spec1 = (spec1s[i] || "").trim();
    const spec2 = (spec2s[i] || "").trim();
    const spec3 = (spec3s[i] || "").trim();
    const spec4 = (spec4s[i] || "").trim();
    const mainCategory = (mainCategories[i] || "").trim();
    const productType = (productTypes[i] || "").trim();
    const vendorRecordId = (vendorRids[i] || "").trim();
    const vendorId = (vendorIds[i] || "").trim();
    if (!itemId && !product) continue;
    items.push({
      itemId,
      product,
      quantity,
      unit,
      description,
      spec1,
      spec2,
      spec3,
      spec4,
      mainCategory,
      productType,
      vendorRecordId,
      vendorId,
    });
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
    spec1: first?.spec1 || get("spec_1") || get("spec1") || get("spec"),
    spec2: first?.spec2 || get("spec_2") || get("spec2"),
    spec3: first?.spec3 || get("spec_3") || get("spec3"),
    spec4: first?.spec4 || get("spec_4") || get("spec4"),
    mainCategory:
      first?.mainCategory || get("main_category") || get("mainCategory") || "",
    productType:
      first?.productType || get("product_type") || get("productType") || "",
    dueDate: get("due_date"),
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
        description: params.description || "",
        spec1: params.spec1 || "",
        spec2: params.spec2 || "",
        spec3: params.spec3 || "",
        spec4: params.spec4 || "",
        mainCategory: params.mainCategory || "",
        productType: params.productType || "",
      },
    ];
  }
  return [];
}

function catalogEntryKey(entry) {
  return String(entry?.itemId || entry?.rowId || "").trim();
}

/** Fill missing qty/product/unit from Creator RFQ_Products when URL params are incomplete. */
export function enrichLineItemsWithCatalog(lineItems, catalog) {
  if (!Array.isArray(lineItems) || !lineItems.length) return lineItems;
  if (!Array.isArray(catalog) || !catalog.length) return lineItems;

  const byId = new Map();
  const byProduct = new Map();
  catalog.forEach((entry) => {
    const idKey = catalogEntryKey(entry);
    if (idKey) byId.set(idKey, entry);
    const product = (entry.product || "").trim().toLowerCase();
    if (product) byProduct.set(product, entry);
  });

  return lineItems.map((line) => {
    const idKey = String(line.itemId || "").trim();
    const productKey = (line.product || "").trim().toLowerCase();
    const hit =
      (idKey && byId.get(idKey)) ||
      (productKey && byProduct.get(productKey)) ||
      null;
    if (!hit) return line;

    const rawLineDesc = line.description || "";
    const hitDesc = normalizeSpacedText(hit.description || "");

    return {
      ...line,
      product: line.product || hit.product || "",
      quantity:
        line.quantity === "" || line.quantity == null
          ? hit.quantity ?? line.quantity
          : line.quantity,
      unit: line.unit || hit.unit || "",
      // Prefer Creator description when present (URL encoding often mangles it).
      description: hitDesc || normalizeSpacedText(rawLineDesc) || "",
      spec1: line.spec1 || hit.spec1 || "",
      spec2: line.spec2 || hit.spec2 || "",
      spec3: line.spec3 || hit.spec3 || "",
      spec4: line.spec4 || hit.spec4 || "",
      mainCategory: line.mainCategory || hit.mainCategory || "",
      productType: line.productType || hit.productType || "",
    };
  });
}

export function lineItemsNeedQuantity(lineItems) {
  return (lineItems || []).some(
    (line) => line.quantity === "" || line.quantity == null
  );
}

/** True when qty / specs / category fields missing — fetch RFQ_Products to prefill. */
export function lineItemsNeedCatalogEnrichment(lineItems) {
  return (lineItems || []).some((line) => {
    if (line.quantity === "" || line.quantity == null) return true;
    // Spaced-out descriptions usually come from URL encoding; refetch clean text from Creator.
    if (isSpacedOutText(line.description)) return true;
    if (!String(line.spec1 || "").trim()) return true;
    if (!String(line.spec2 || "").trim()) return true;
    if (!String(line.spec3 || "").trim()) return true;
    if (!String(line.spec4 || "").trim()) return true;
    if (!String(line.mainCategory || "").trim()) return true;
    if (!String(line.productType || "").trim()) return true;
    return false;
  });
}
