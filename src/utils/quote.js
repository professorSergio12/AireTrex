/** Auto quote number: compact datetime + last digit of RFQ number. */
export function generateQuoteNumber(rfqNumber) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const dt =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const digits = String(rfqNumber ?? "").replace(/\D/g, "");
  const lastDigit = digits.slice(-1) || "0";
  return `QT${dt}${lastDigit}`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Line totals from ex-GST subtotal entered by vendor. */
export function calcLinePricing({ totalAmount, gstPct, quantity }) {
  const subtotal = Number(totalAmount) || 0;
  const gst = Number(gstPct) || 0;
  const qty = Number(quantity) || 1;
  const unitPrice = qty > 0 ? Math.round((subtotal / qty) * 100) / 100 : 0;
  const gstAmount = Math.round(((subtotal * gst) / 100) * 100) / 100;
  const grandTotal = Math.round((subtotal + gstAmount) * 100) / 100;
  return { unitPrice, gstAmount, grandTotal, subtotal };
}

export function fmtMoney(n, currency = "INR") {
  return `${currency} ${Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
