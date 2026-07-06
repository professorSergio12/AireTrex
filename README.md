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

## Going live

Edit `src/config.js`:

1. `MOCK_MODE: false`
2. `SUBMIT_ENDPOINT` → your backend or Zoho Creator "Add Records" endpoint.

The payload always includes `uniqueId`; `utils/api.js` → `buildCreatorBody`
maps it (and every quote field) to Creator field link names. Adjust those names
to match your Quotation form.

> For public vendor submissions, proxy through your own backend so the Zoho
> OAuth token stays server-side. The form only needs a URL that accepts the JSON
> payload.

## Build for deployment

```bash
npm run build   # outputs to dist/
```

Host `dist/` at the domain you configured as `REACT_FORM_BASE_URL` in the widget
(`airetrex/app/js/config.js`) and in the Deluge function.
