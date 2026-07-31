/** Auto quote number: QT-YYYY-MM-DD-RRRR (RFQ padded to 4 digits). */
export function generateQuoteNumber(rfqNumber) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const digits = String(rfqNumber ?? "").replace(/\D/g, "");
  const rfqPart = digits.slice(-4).padStart(4, "0") || "0000";
  return `QT-${datePart}-${rfqPart}`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const TAX_BY_CURRENCY = {
  INR: { defaultPct: 18, label: "GST" },
  USD: { defaultPct: 0, label: "Sales Tax" },
  EUR: { defaultPct: 20, label: "VAT" },
  GBP: { defaultPct: 20, label: "VAT" },
  AED: { defaultPct: 5, label: "VAT" },
};

function taxConfigForCurrency(currency) {
  const key = String(currency || "").toUpperCase();
  return TAX_BY_CURRENCY[key] || { defaultPct: 0, label: "Tax" };
}

/** Default tax % by currency (INR 18, USD 0, EUR/GBP 20, AED 5). */
export function defaultGstForCurrency(currency) {
  return taxConfigForCurrency(currency).defaultPct;
}

/** UI label: GST / Sales Tax / VAT (without %). */
export function taxLabelForCurrency(currency) {
  return taxConfigForCurrency(currency).label;
}

/** Column / summary label with % suffix. */
export function taxFieldLabelForCurrency(currency) {
  return `${taxLabelForCurrency(currency)} %`;
}

/** Parse tax % — 0 is valid. Empty/invalid → fallback. */
export function parseGstPct(gstPct, fallback = 0) {
  if (gstPct === null || gstPct === undefined || gstPct === "") return fallback;
  const n = Number(gstPct);
  return Number.isFinite(n) ? n : fallback;
}

/** Line totals from unit price. Tax 0 is allowed and calculated as 0. */
export function calcLineFromUnitPrice({ unitPrice, gstPct = 0, quantity }) {
  const price = Number(unitPrice) || 0;
  const gst = parseGstPct(gstPct, 0);
  const qty = Number(quantity) || 1;
  const subtotal = Math.round(price * qty * 100) / 100;
  const gstAmount = Math.round(((subtotal * gst) / 100) * 100) / 100;
  const grandTotal = Math.round((subtotal + gstAmount) * 100) / 100;
  return { unitPrice: price, gstAmount, grandTotal, subtotal };
}

export function fmtMoney(n, currency = "INR") {
  return `${currency} ${Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
