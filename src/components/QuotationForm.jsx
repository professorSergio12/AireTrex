import { useMemo, useState } from "react";
import { CONFIG } from "../config";
import { getRfqParams, resolveLineItems, resolveUid } from "../utils/params";
import {
  calcLinePricing,
  fmtMoney,
  generateQuoteNumber,
  todayIso,
} from "../utils/quote";
import { submitQuotation } from "../utils/api";
import { Field, ReadOnlyField } from "./Field";
import { FileUploadField } from "./FileUploadField";
import { SuccessScreen } from "./SuccessScreen";

function initialLineRows(lineItems, defaultGst) {
  return lineItems.map(() => ({
    description: "",
    deliveryDate: "",
    totalAmount: "",
    gst: defaultGst,
    remarks: "",
    attachment: null,
    datasheet: null,
  }));
}

export function QuotationForm() {
  const rfq = useMemo(() => getRfqParams(), []);
  const lineItems = useMemo(() => resolveLineItems(rfq), [rfq]);
  const uniqueId = useMemo(() => resolveUid(rfq), [rfq]);
  const multiItem = lineItems.length > 1;
  const defaultGst = "18";
  const autoQuoteNumber = useMemo(
    () => generateQuoteNumber(rfq.rfqNumber),
    [rfq.rfqNumber]
  );

  const [form, setForm] = useState({
    quoteNumber: autoQuoteNumber,
    quoteDate: todayIso(),
    contactEmail: rfq.email || "",
    currency: rfq.currency || "INR",
    remarks: "",
  });
  const [lineRows, setLineRows] = useState(() => initialLineRows(lineItems, defaultGst));
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [errMsg, setErrMsg] = useState("");

  const linkValid = Boolean(rfq.rfqNumber && lineItems.length > 0);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function patchLineRow(index, patch) {
    setLineRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function validate() {
    const e = {};
    lineRows.forEach((row, i) => {
      if (!row.totalAmount || Number(row.totalAmount) <= 0) {
        e[`totalAmount_${i}`] = "Required";
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setStatus("submitting");
    setErrMsg("");

    const items = lineItems.map((line, i) => {
      const row = lineRows[i] || {};
      const pricing = calcLinePricing({
        totalAmount: row.totalAmount,
        gstPct: row.gst,
        quantity: line.quantity,
      });

      return {
        itemId: line.itemId,
        itemMasterId: line.itemId,
        product: line.product,
        quantity: line.quantity,
        unit: line.unit,
        description: row.description || "",
        deliveryDate: row.deliveryDate || "",
        totalAmount: row.totalAmount || "",
        price: String(pricing.unitPrice),
        gst: row.gst || defaultGst,
        gstAmount: String(pricing.gstAmount),
        remarks: row.remarks || "",
        uniqueId: `${rfq.rfqNumber}_${line.itemId}_${rfq.vendorId || rfq.vendorRecordId}`,
      };
    });

    const payload = {
      uniqueId,
      rfqNumber: rfq.rfqNumber,
      rfqRecordId: rfq.rfqRecordId,
      vendorId: rfq.vendorId,
      vendorRecordId: rfq.vendorRecordId,
      vendorName: rfq.vendorName,
      quoteNumber: form.quoteNumber || autoQuoteNumber,
      quoteDate: form.quoteDate,
      contactEmail: form.contactEmail,
      currency: form.currency,
      remarks: form.remarks,
      items: JSON.stringify(items),
      itemId: items[0]?.itemId || "",
      product: items[0]?.product || "",
      quantity: items[0]?.quantity || "",
      price: items[0]?.price || "",
    };

    const files = {};
    lineRows.forEach((row, i) => {
      if (row.attachment) files[`attachment_${i}`] = row.attachment;
      if (row.datasheet) files[`datasheet_${i}`] = row.datasheet;
    });

    try {
      const result = await submitQuotation(payload, files);
      if (result.uploadWarning) {
        setErrMsg(`Quotation saved, but file upload failed: ${result.uploadWarning}`);
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrMsg(err.message || "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <SuccessScreen rfq={rfq} uniqueId={uniqueId} itemCount={lineItems.length} />
    );
  }

  return (
    <div className="page">
      <header className="brand">
        <div className="brand__logo">AT</div>
        <div>
          <h1>Quotation Form</h1>
          <p>
            {multiItem
              ? `Quote ${lineItems.length} items in one submission`
              : "Fill quote details for the requested item"}
          </p>
        </div>
        {CONFIG.MOCK_MODE && <span className="mock-pill">DEMO MODE</span>}
      </header>

      {!linkValid && (
        <div className="alert alert--warn">
          This link is missing RFQ details. Please use the link from your RFQ email.
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <section className="card">
          <h2 className="card__title">RFQ Reference</h2>
          <div className="grid grid-3">
            <ReadOnlyField label="RFQ #" value={rfq.rfqNumber} />
            <ReadOnlyField
              label="Line Items"
              value={multiItem ? `${lineItems.length} items` : lineItems[0]?.product}
            />
            <ReadOnlyField label="Vendor" value={rfq.vendorName || rfq.vendorId} />
          </div>
        </section>

        <section className="card">
          <h2 className="card__title">Quote Information</h2>
          <div className="grid grid-2">
            <ReadOnlyField label="Quote Number (auto-generated)" value={form.quoteNumber} />
            <Field label="Quote Date">
              <input
                className="input"
                type="date"
                value={form.quoteDate}
                onChange={set("quoteDate")}
              />
            </Field>
          </div>
          <div className="grid grid-2">
            <Field label="Currency">
              <select className="input" value={form.currency} onChange={set("currency")}>
                {CONFIG.CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <ReadOnlyField label="Contact Email" value={form.contactEmail || "—"} />
          </div>
        </section>

        <section className="card">
          <h2 className="card__title">Items to Quote</h2>
          <div className="item-cards">
            {lineItems.map((line, i) => (
              <ItemCard
                key={`${line.itemId}-${i}`}
                index={i}
                line={line}
                row={lineRows[i] || {}}
                currency={form.currency}
                errors={errors}
                onPatch={(patch) => patchLineRow(i, patch)}
              />
            ))}
          </div>
          <GrandTotalPreview currency={form.currency} lineItems={lineItems} lineRows={lineRows} />
        </section>

        <section className="card">
          <Field label="Overall Remarks (Optional)">
            <textarea
              className="input textarea"
              rows={2}
              placeholder="General notes for this quotation…"
              value={form.remarks}
              onChange={set("remarks")}
            />
          </Field>
        </section>

        {errMsg && <div className="alert alert--error">{errMsg}</div>}

        <div className="actions">
          <button
            className="btn btn--primary"
            type="submit"
            disabled={status === "submitting" || !linkValid}
          >
            {status === "submitting"
              ? "Submitting…"
              : multiItem
                ? `Submit Quotation (${lineItems.length} items)`
                : "Submit Quotation"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ItemCard({ index, line, row, currency, errors, onPatch }) {
  const pricing = calcLinePricing({
    totalAmount: row.totalAmount,
    gstPct: row.gst,
    quantity: line.quantity,
  });

  return (
    <article className="item-card">
      <header className="item-card__head">
        <div>
          <span className="item-card__index">Item {index + 1}</span>
          <h3 className="item-card__title">{line.product || "—"}</h3>
        </div>
        <span className="item-card__qty">{qtyLabel(line)}</span>
      </header>

      <div className="item-card__grid">
        <Field label="Product Description">
          <textarea
            className="input textarea textarea--compact"
            rows={2}
            placeholder="Describe the product you are quoting…"
            value={row.description}
            onChange={(e) => onPatch({ description: e.target.value })}
          />
        </Field>

        <Field label="Delivery Date">
          <input
            className="input"
            type="date"
            value={row.deliveryDate}
            onChange={(e) => onPatch({ deliveryDate: e.target.value })}
          />
        </Field>

        <Field label="Line Total (ex-GST) *" hint={errors[`totalAmount_${index}`]}>
          <input
            className={`input ${errors[`totalAmount_${index}`] ? "input--error" : ""}`}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={row.totalAmount}
            onChange={(e) => onPatch({ totalAmount: e.target.value })}
          />
        </Field>

        <Field label="GST %">
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={row.gst}
            onChange={(e) => onPatch({ gst: e.target.value })}
          />
        </Field>

        <ReadOnlyField
          label="Unit Price (calculated)"
          value={
            pricing.unitPrice > 0
              ? fmtMoney(pricing.unitPrice, currency)
              : "—"
          }
        />

        <ReadOnlyField
          label="GST Amount (calculated)"
          value={
            pricing.gstAmount > 0
              ? fmtMoney(pricing.gstAmount, currency)
              : "—"
          }
        />

        <Field label="Remarks">
          <input
            className="input"
            placeholder="Optional notes for this item"
            value={row.remarks}
            onChange={(e) => onPatch({ remarks: e.target.value })}
          />
        </Field>

        <div className="item-card__files">
          <span className="field__label">Files</span>
          <div className="item-card__file-row">
            <FileUploadField
              label="Attachment"
              file={row.attachment}
              onChange={(file) => onPatch({ attachment: file })}
            />
            <FileUploadField
              label="Datasheet"
              file={row.datasheet}
              onChange={(file) => onPatch({ datasheet: file })}
            />
          </div>
        </div>
      </div>

      {pricing.grandTotal > 0 && (
        <footer className="item-card__footer">
          <strong>Line total incl. GST: {fmtMoney(pricing.grandTotal, currency)}</strong>
        </footer>
      )}
    </article>
  );
}

function qtyLabel(line) {
  if (!line.quantity) return "Qty: —";
  return `Qty: ${line.quantity} ${line.unit || ""}`.trim();
}

function GrandTotalPreview({ currency, lineItems, lineRows }) {
  let subtotal = 0;
  let totalGst = 0;

  lineItems.forEach((line, i) => {
    const row = lineRows[i] || {};
    const pricing = calcLinePricing({
      totalAmount: row.totalAmount,
      gstPct: row.gst,
      quantity: line.quantity,
    });
    subtotal += pricing.subtotal;
    totalGst += pricing.gstAmount;
  });

  if (!subtotal) return null;
  const grandTotal = subtotal + totalGst;

  return (
    <div className="total-preview">
      <span>Subtotal (ex-GST): {fmtMoney(subtotal, currency)}</span>
      <span>GST total: {fmtMoney(totalGst, currency)}</span>
      <strong>Grand total: {fmtMoney(grandTotal, currency)}</strong>
    </div>
  );
}
