import { useMemo, useState } from "react";
import { CONFIG } from "../config";
import { getRfqParams, resolveUid } from "../utils/params";
import { submitQuotation } from "../utils/api";
import { Field, ReadOnlyField } from "./Field";
import { SuccessScreen } from "./SuccessScreen";

const today = () => new Date().toISOString().slice(0, 10);

export function QuotationForm() {
  // RFQ context prefilled from the email link (read once).
  const rfq = useMemo(() => getRfqParams(), []);
  const uniqueId = useMemo(() => resolveUid(rfq), [rfq]);

  const [form, setForm] = useState({
    quoteNumber: "",
    quoteDate: today(),
    contactEmail: rfq.email || "",
    price: "",
    currency: rfq.currency || "INR",
    leadTime: "",
    validity: "",
    freight: "",
    gst: "18",
    remarks: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | done | error
  const [errMsg, setErrMsg] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [datasheet, setDatasheet] = useState(null);

  // Guard: link must carry enough context to identify the RFQ.
  const linkValid = Boolean(rfq.rfqNumber && rfq.itemId);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function validate() {
    const e = {};
    if (!form.price || Number(form.price) <= 0) e.price = "Enter a valid price.";
    if (form.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.contactEmail))
      e.contactEmail = "Enter a valid email.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setStatus("submitting");
    setErrMsg("");

    const payload = {
      uniqueId,
      rfqNumber: rfq.rfqNumber,
      rfqRecordId: rfq.rfqRecordId,
      itemId: rfq.itemId,
      vendorId: rfq.vendorId,
      vendorRecordId: rfq.vendorRecordId,
      vendorName: rfq.vendorName,
      product: rfq.product,
      quantity: rfq.quantity,
      quoteNumber: form.quoteNumber,
      quoteDate: form.quoteDate,
      contactEmail: form.contactEmail,
      price: form.price,
      currency: form.currency,
      leadTime: form.leadTime,
      validity: form.validity,
      freight: form.freight,
      gst: form.gst,
      remarks: form.remarks,
    };

    try {
      const result = await submitQuotation(payload, { attachment, datasheet });
      if (result.uploadWarning) {
        setErrMsg(
          `Quotation saved, but file upload failed: ${result.uploadWarning}. ` +
            "Please contact the buyer or retry with a smaller file."
        );
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
    return <SuccessScreen rfq={rfq} uniqueId={uniqueId} />;
  }

  return (
    <div className="page">
      <header className="brand">
        <div className="brand__logo">AT</div>
        <div>
          <h1>Quotation Form</h1>
          <p>Fill quote details for the requested item</p>
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
        {/* ---------------- RFQ reference (prefilled) ---------------- */}
        <section className="card">
          <h2 className="card__title">RFQ Reference</h2>
          <div className="grid grid-3">
            <ReadOnlyField label="RFQ #" value={rfq.rfqNumber} />
            <ReadOnlyField label="RFQ Item ID" value={rfq.itemId} />
            <ReadOnlyField label="Vendor" value={rfq.vendorName || rfq.vendorId} />
          </div>
          <Field label="Product / Requirement">
            <textarea
              className="input textarea"
              rows={2}
              value={buildProductSummary(rfq)}
              readOnly
            />
          </Field>
          <div className="grid grid-2">
            <ReadOnlyField label="Quantity" value={qtyLabel(rfq)} />
            <ReadOnlyField label="Brand" value={rfq.brand} />
          </div>
        </section>

        {/* ---------------- Quote information ---------------- */}
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
          <Field label="Contact Email" hint={errors.contactEmail} >
            <input
              className={`input ${errors.contactEmail ? "input--error" : ""}`}
              type="email"
              placeholder="name@company.com"
              value={form.contactEmail}
              onChange={set("contactEmail")}
            />
          </Field>
        </section>

        {/* ---------------- Quote details ---------------- */}
        <section className="card">
          <h2 className="card__title">Quote Details</h2>
          <div className="grid grid-3">
            <Field label="Price" required hint={errors.price}>
              <input
                className={`input ${errors.price ? "input--error" : ""}`}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.price}
                onChange={set("price")}
              />
            </Field>
            <Field label="Currency">
              <select className="input" value={form.currency} onChange={set("currency")}>
                {CONFIG.CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
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
          </div>
          <div className="grid grid-3">
            <Field label="Validity">
              <input
                className="input"
                placeholder="e.g. 30 days"
                value={form.validity}
                onChange={set("validity")}
              />
            </Field>
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

          <TotalPreview form={form} />

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
            {status === "submitting" ? "Submitting…" : "Submit Quotation"}
          </button>
        </div>
      </form>
    </div>
  );
}

function qtyLabel(rfq) {
  if (!rfq.quantity) return "—";
  return `${rfq.quantity} ${rfq.unit || ""}`.trim();
}

function buildProductSummary(rfq) {
  const parts = [rfq.product, rfq.spec].filter(Boolean);
  return parts.join(" — ") || "—";
}

function TotalPreview({ form }) {
  const price = Number(form.price) || 0;
  const gst = Number(form.gst) || 0;
  if (!price) return null;
  const gstAmt = (price * gst) / 100;
  const total = price + gstAmt;
  const fmt = (n) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="total-preview">
      <span>Unit price: {form.currency} {fmt(price)}</span>
      <span>+ GST ({gst}%): {form.currency} {fmt(gstAmt)}</span>
      <strong>Landed / unit: {form.currency} {fmt(total)}</strong>
    </div>
  );
}
