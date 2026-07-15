/*
 * Quotation Form configuration.
 *
 * MOCK_MODE lets you develop the form without any backend. When false, the
 * form POSTs the vendor's quote to the quotation-backend proxy, which holds the
 * Zoho refresh token server-side, mints an access token, and inserts the record
 * into the Creator "Vendor Quotations" module.
 */
export const CONFIG = {
  MOCK_MODE: false,

  // URL of the quotation-backend proxy (see ../../quotation-backend).
  // Local dev: quotation-backend on PORT 8787 (npm run dev in quotation-backend/)
  // BACKEND_URL: "https://vendor-form-gpsx.onrender.com/api/quotations",
  BACKEND_URL: "http://localhost:8787/api/quotations",
  // DEADLINE_URL: "https://vendor-form-gpsx.onrender.com/api/rfq-deadline",
  DEADLINE_URL: "http://localhost:8787/api/rfq-deadline",

  CURRENCIES: ["INR", "USD", "EUR", "GBP", "AED"],
};
