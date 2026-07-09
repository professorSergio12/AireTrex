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

/** Line totals from unit price (GST @ 18% default). */
export function calcLineFromUnitPrice({ unitPrice, gstPct = 18, quantity }) {
  const price = Number(unitPrice) || 0;
  const gst = Number(gstPct) || 18;
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
