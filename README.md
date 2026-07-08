# AiraTrex · Quotation Form (React)

The vendor-facing form that opens from the RFQ email. It reads the RFQ context
from the URL, shows prefilled (locked) reference fields, lets the vendor enter
their quote, and submits it back with a **unique id** so the AiraTrex Sourcing
Desk widget can match the quote to the exact deal + item + vendor.

## Folder structure

```
my-react-app/
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── config.js                # MOCK_MODE + submit endpoint
│   ├── components/
│   │   ├── QuotationForm.jsx     # the form
│   │   ├── Field.jsx             # small field wrappers
│   │   └── SuccessScreen.jsx     # post-submit confirmation
│   ├── utils/
│   │   ├── params.js             # reads query-string RFQ context
│   │   └── api.js                # submit (mock / Creator endpoint)
│   └── styles/form.css
└── vite.config.js
```

## Run locally

```bash
cd my-react-app
npm install
npm run dev
```

Open the printed URL **with query params** to see the form prefilled, e.g.:

```
http://localhost:5173/?uid=RFQ-2026-001_IT-001_VEN-001&rfq_no=RFQ-2026-001&item_id=IT-001&vendor_id=VEN-001&vendor_name=Precision%20Bearings%20Co.&product=Industrial%20Ball%20Bearings&qty=500&unit=Nos&brand=SKF
```

## URL parameters (sent by the Deluge email)

| Param         | Meaning                                   |
| ------------- | ----------------------------------------- |
| `uid`         | Unique id `RFQ_Item_Vendor` (correlation) |
| `rfq_no`      | RFQ number                                |
| `item_id`     | Line item id                              |
| `vendor_id`   | Vendor code                               |
| `vendor_name` | Vendor display name                       |
| `product`     | Product name                              |
| `qty` / `unit`| Quantity from the deal                    |
| `brand`       | Requested brand                           |
| `spec`        | Spec / description                        |
| `email`       | Vendor email (prefills contact)           |

## Going live — where submissions land

Submitted quotes are written straight into the **Vendor Quotations** Creator
module (so they show in the Vendor Quotations Report) via the **Creator v2 Data
API** (Add Records). `utils/api.js` → `buildCreatorPayload` builds the exact
body your form expects:

```jsonc
{
  "data": {
    "RFQ_ID": "...",            // main form
    "Vendor_Master": "VEN-001", // main form
    "Submission_Date": "06-Jul-2026 12:31:00",
    "Quotation_Items": [        // subform grid
      { "RFQ_Item_ID": "...", "Product": "...", "Quantity": 34,
        "Currency": "INR", "Freight": 500, "Unit_Price": 210,
        "GST": 18, "Total_Amount": 8449.2, "Validity": "30 days",
        "Remarks": "..." }
    ],
    "Margin": 0,
    "Status": "Pending Review"
  }
}
```

Setup in `src/config.js` → `CONFIG.CREATOR`:

1. `MOCK_MODE: false`
2. `dc`, `accountOwner`, `appLinkName` → your app (URL becomes
   `https://creator.zoho.<dc>/api/v2/<owner>/<app>/form/Vendor_Quotations`).
3. `accessToken` → OAuth token with `ZohoCreator.form.CREATE` scope.

`Total_Amount` is computed as `(Unit_Price × Quantity) + GST + Freight`; all
numeric fields are coerced with `parseFloat`/`parseInt` so strict subform
validation won't reject them.

> ⚠️ A token in browser code is public and the Creator host will usually block
> the request via CORS. For production, proxy this POST through your own backend
> or a Zoho Catalyst function so the token stays server-side. `../DELUGE_saveVendorQuotation.dg`
> is an alternative if you'd rather expose a public Deluge REST function instead.

## Build for deployment

```bash
npm run build   # outputs to dist/
```

Host `dist/` at the domain you configured as `REACT_FORM_BASE_URL` in the widget
(`airetrex/app/js/config.js`) and in the Deluge function.
