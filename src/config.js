/*
 * Quotation Form configuration.
 *
 * MOCK_MODE lets you develop the form without a live Zoho Creator endpoint.
 * When true, submissions are logged to the console + stored in-memory and a
 * success screen is shown. When false, the form POSTs to SUBMIT_ENDPOINT.
 */
export const CONFIG = {
  MOCK_MODE: false,

  /*
   * Where the vendor's quote is submitted. Point this at a Zoho Creator
   * published form REST endpoint (or your own backend that writes to Creator).
   *
   * Zoho Creator "Add Records" API shape:
   *   POST https://www.zohoapis.<dc>/creator/v2.1/data/<owner>/<app>/form/<form_link_name>
   *   Headers: Authorization: Zoho-oauthtoken <token>
   *   Body: { "data": { <field_link_name>: value, ... } }
   *
   * For public vendor submissions you'd typically proxy this through your own
   * backend (to keep the OAuth token server-side) or use a Creator published
   * form URL. Set that URL here.
   */
  SUBMIT_ENDPOINT: "https://your-backend-or-creator-endpoint.com/quotations",

  CURRENCIES: ["INR", "USD", "EUR", "GBP", "AED"],
};
