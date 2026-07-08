import { useMemo, useState } from "react";
import { CONFIG } from "../config";
import { getRfqParams, resolveLineItems, resolveUid } from "../utils/params";
import { submitQuotation } from "../utils/api";
import { Field, ReadOnlyField } from "./Field";
import { SuccessScreen } from "./SuccessScreen";

const today = () => new Date().toISOString().slice(0, 10);

function initialLineRows(lineItems, defaultGst) {
  return lineItems.map(() => ({
    price: "",
    leadTime: "",
    validity: "",
    freight: "",
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

  const [form, setForm] = useState({
    quoteNumber: "",
    quoteDate: today(),
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
      if (!row.price || Number(row.price) <= 0) {
        e[`price_${i}`] = "Required";
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

    const items = lineItems.map((line, i) => {
      const row = lineRows[i] || {};
      return {
        itemId: line.itemId,
        itemMasterId: line.itemId,
        product: line.product,
        quantity: line.quantity,
        unit: line.unit,
        price: row.price || "",
        leadTime: row.leadTime || "",
        validity: row.validity || "",
        freight: row.freight || "",
        gst: row.gst || defaultGst,
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
      quoteNumber: form.quoteNumber,
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
          <div className="grid grid-3">
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
            <Field label="Currency">
              <select className="input" value={form.currency} onChange={set("currency")}>
                {CONFIG.CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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
          <h2 className="card__title">Items to Quote</h2>
          <div className="items-table-wrap items-table-wrap--wide">
            <table className="items-table items-table--quote">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price *</th>
                  <th>Lead Time</th>
                  <th>Validity</th>
                  <th>Freight</th>
                  <th>GST %</th>
                  <th>Remarks</th>
                  <th>Attachment</th>
                  <th>Datasheet</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((line, i) => {
                  const row = lineRows[i] || {};
                  return (
                    <tr key={`${line.itemId}-${i}`}>
                      <td className="items-table__product">
                        <strong>{line.product || "—"}</strong>
                        <div className="muted small">Item Master ID: {line.itemId || "—"}</div>
                      </td>
                      <td className="items-table__qty">{qtyLabel(line)}</td>
                      <td>
                        <input
                          className={`input input--compact ${errors[`price_${i}`] ? "input--error" : ""}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={row.price}
                          onChange={(e) => patchLineRow(i, { price: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="input input--compact"
                          placeholder="4-6 weeks"
                          value={row.leadTime}
                          onChange={(e) => patchLineRow(i, { leadTime: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="input input--compact"
                          placeholder="30 days"
                          value={row.validity}
                          onChange={(e) => patchLineRow(i, { validity: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="input input--compact"
                          placeholder="0"
                          value={row.freight}
                          onChange={(e) => patchLineRow(i, { freight: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="input input--compact"
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.gst}
                          onChange={(e) => patchLineRow(i, { gst: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="input input--compact"
                          placeholder="Notes"
                          value={row.remarks}
                          onChange={(e) => patchLineRow(i, { remarks: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="input input--file input--compact"
                          type="file"
                          onChange={(e) =>
                            patchLineRow(i, { attachment: e.target.files?.[0] || null })
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="input input--file input--compact"
                          type="file"
                          onChange={(e) =>
                            patchLineRow(i, { datasheet: e.target.files?.[0] || null })
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TotalPreview form={form} lineRows={lineRows} lineItems={lineItems} />
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

function qtyLabel(line) {
  if (!line.quantity) return "—";
  return `${line.quantity} ${line.unit || ""}`.trim();
}

function TotalPreview({ form, lineRows, lineItems }) {
  let subtotal = 0;
  let totalFreight = 0;
  let totalGst = 0;

  lineItems.forEach((line, i) => {
    const row = lineRows[i] || {};
    const price = Number(row.price) || 0;
    const qty = Number(line.quantity) || 1;
    const freight = Number(row.freight) || 0;
    const gstPct = Number(row.gst) || 0;
    const lineBase = price * qty;
    subtotal += lineBase;
    totalFreight += freight;
    totalGst += (lineBase * gstPct) / 100;
  });

  if (!subtotal) return null;
  const total = subtotal + totalGst + totalFreight;
  const fmt = (n) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="total-preview">
      <span>Subtotal: {form.currency} {fmt(subtotal)}</span>
      <span>GST total: {form.currency} {fmt(totalGst)}</span>
      {totalFreight > 0 && <span>Freight total: {form.currency} {fmt(totalFreight)}</span>}
      <strong>Grand total: {form.currency} {fmt(total)}</strong>
    </div>
  );
}
