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
  // In production point this at your deployed backend, e.g.
  //   https://api.your-domain.com/api/quotations
  BACKEND_URL: "https://vendor-form-gpsx.onrender.com/api/quotations",

  CURRENCIES: ["INR", "USD", "EUR", "GBP", "AED"],
};
