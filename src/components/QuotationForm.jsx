import { useMemo, useState } from "react";
import { CONFIG } from "../config";
import { getRfqParams, resolveLineItems, resolveUid } from "../utils/params";
import { submitQuotation } from "../utils/api";
import { Field, ReadOnlyField } from "./Field";
import { SuccessScreen } from "./SuccessScreen";

const today = () => new Date().toISOString().slice(0, 10);

function initialLinePrices(lineItems) {
  return lineItems.map(() => ({ price: "" }));
}

export function QuotationForm() {
  const rfq = useMemo(() => getRfqParams(), []);
  const lineItems = useMemo(() => resolveLineItems(rfq), [rfq]);
  const uniqueId = useMemo(() => resolveUid(rfq), [rfq]);
  const multiItem = lineItems.length > 1;

  const [form, setForm] = useState({
    quoteNumber: "",
    quoteDate: today(),
    contactEmail: rfq.email || "",
    currency: rfq.currency || "INR",
    leadTime: "",
    validity: "",
    freight: "",
    gst: "18",
    remarks: "",
  });
  const [linePrices, setLinePrices] = useState(() => initialLinePrices(lineItems));
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [errMsg, setErrMsg] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [datasheet, setDatasheet] = useState(null);

  const linkValid = Boolean(rfq.rfqNumber && lineItems.length > 0);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function setLinePrice(index, value) {
    setLinePrices((rows) =>
      rows.map((row, i) => (i === index ? { ...row, price: value } : row))
    );
  }

  function validate() {
    const e = {};
    linePrices.forEach((row, i) => {
      if (!row.price || Number(row.price) <= 0) {
        e[`price_${i}`] = "Enter a valid price.";
      }
    });
    if (form.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.contactEmail)) {
      e.contactEmail = "Enter a valid email.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setStatus("submitting");
    setErrMsg("");

    const items = lineItems.map((line, i) => ({
      itemId: line.itemId,
      product: line.product,
      quantity: line.quantity,
      unit: line.unit,
      price: linePrices[i]?.price || "",
      uniqueId: `${rfq.rfqNumber}_${line.itemId}_${rfq.vendorId || rfq.vendorRecordId}`,
    }));

    const payload = {
      uniqueId,
      rfqNumber: rfq.rfqNumber,
      rfqRecordId: rfq.rfqRecordId,
      vendorId: rfq.vendorId,
      vendorRecordId: rfq.vendorRecordId,
      vendorName: rfq.vendorName,
      quoteNumber: form.quoteNumber,
      quoteDate: form.quoteDate,
      contactEmail: form.contactEmail,
      currency: form.currency,
      leadTime: form.leadTime,
      validity: form.validity,
      freight: form.freight,
      gst: form.gst,
      remarks: form.remarks,
      items: JSON.stringify(items),
      // Legacy single-item fields (first row) for backward compatibility
      itemId: items[0]?.itemId || "",
      product: items[0]?.product || "",
      quantity: items[0]?.quantity || "",
      price: items[0]?.price || "",
    };

    try {
      const result = await submitQuotation(payload, { attachment, datasheet });
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
              ? `Submit quotes for ${lineItems.length} items in one form`
              : "Fill quote details for the requested item"}
          </p>
        </div>
        {CONFIG.MOCK_MODE && <span className="mock-pill">DEMO MODE</span>}
      </header>

      {!linkValid && (
        <div className="alert alert--warn">
          This link is missing RFQ details. Please use the link from your RFQ
          email so the form can identify your enquiry.
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <section className="card">
          <h2 className="card__title">RFQ Reference</h2>
          <div className="grid grid-3">
            <ReadOnlyField label="RFQ #" value={rfq.rfqNumber} />
            <ReadOnlyField
              label="Items"
              value={multiItem ? `${lineItems.length} line items` : lineItems[0]?.itemId}
            />
            <ReadOnlyField label="Vendor" value={rfq.vendorName || rfq.vendorId} />
          </div>
        </section>

        <section className="card">
          <h2 className="card__title">Items to Quote</h2>
          <div className="items-table-wrap">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit Price *</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((line, i) => (
                  <tr key={`${line.itemId}-${i}`}>
                    <td>
                      <strong>{line.product || "—"}</strong>
                      <div className="muted small">Item ID: {line.itemId || "—"}</div>
                    </td>
                    <td>{qtyLabel(line)}</td>
                    <td>
                      <input
                        className={`input ${errors[`price_${i}`] ? "input--error" : ""}`}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={linePrices[i]?.price || ""}
                        onChange={(e) => setLinePrice(i, e.target.value)}
                      />
                      {errors[`price_${i}`] && (
                        <div className="field-hint field-hint--error">
                          {errors[`price_${i}`]}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2 className="card__title">Quote Information</h2>
          <div className="grid grid-2">
            <Field label="Quote Number">
              <input
                className="input"
                placeholder="e.g. QT-2026-001"
                value={form.quoteNumber}
                onChange={set("quoteNumber")}
              />
            </Field>
            <Field label="Quote Date">
              <input
                className="input"
                type="date"
                value={form.quoteDate}
                onChange={set("quoteDate")}
              />
            </Field>
          </div>
          <Field label="Contact Email" hint={errors.contactEmail}>
            <input
              className={`input ${errors.contactEmail ? "input--error" : ""}`}
              type="email"
              placeholder="name@company.com"
              value={form.contactEmail}
              onChange={set("contactEmail")}
            />
          </Field>
        </section>

        <section className="card">
          <h2 className="card__title">Quote Details</h2>
          <div className="grid grid-3">
            <Field label="Currency">
              <select className="input" value={form.currency} onChange={set("currency")}>
                {CONFIG.CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Lead Time">
              <input
                className="input"
                placeholder="e.g. 4-6 weeks"
                value={form.leadTime}
                onChange={set("leadTime")}
              />
            </Field>
            <Field label="Validity">
              <input
                className="input"
                placeholder="e.g. 30 days"
                value={form.validity}
                onChange={set("validity")}
              />
            </Field>
          </div>
          <div className="grid grid-2">
            <Field label="Freight">
              <input
                className="input"
                placeholder="e.g. Ex-works / 500"
                value={form.freight}
                onChange={set("freight")}
              />
            </Field>
            <Field label="GST (%)">
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.gst}
                onChange={set("gst")}
              />
            </Field>
          </div>

          <TotalPreview form={form} linePrices={linePrices} lineItems={lineItems} />

          <Field label="Remarks">
            <textarea
              className="input textarea"
              rows={3}
              placeholder="Additional notes…"
              value={form.remarks}
              onChange={set("remarks")}
            />
          </Field>

          <div className="grid grid-2">
            <Field label="Attachment (Optional)">
              <input
                className="input input--file"
                type="file"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              />
            </Field>
            <Field label="Datasheet (Optional)">
              <input
                className="input input--file"
                type="file"
                onChange={(e) => setDatasheet(e.target.files?.[0] || null)}
              />
            </Field>
          </div>
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

function qtyLabel(line) {
  if (!line.quantity) return "—";
  return `${line.quantity} ${line.unit || ""}`.trim();
}

function TotalPreview({ form, linePrices, lineItems }) {
  const gst = Number(form.gst) || 0;
  const freight = Number(form.freight) || 0;
  let subtotal = 0;

  lineItems.forEach((line, i) => {
    const price = Number(linePrices[i]?.price) || 0;
    const qty = Number(line.quantity) || 1;
    subtotal += price * qty;
  });

  if (!subtotal) return null;

  const gstAmt = (subtotal * gst) / 100;
  const total = subtotal + gstAmt + freight;
  const fmt = (n) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="total-preview">
      <span>Subtotal: {form.currency} {fmt(subtotal)}</span>
      <span>+ GST ({gst}%): {form.currency} {fmt(gstAmt)}</span>
      {freight > 0 && <span>+ Freight: {form.currency} {fmt(freight)}</span>}
      <strong>Grand total: {form.currency} {fmt(total)}</strong>
    </div>
  );
}
