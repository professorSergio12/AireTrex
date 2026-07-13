import { useEffect, useMemo, useRef, useState } from "react";
import { CONFIG } from "../config";
import { getRfqParams, resolveLineItems, resolveUid } from "../utils/params";
import {
  calcLineFromUnitPrice,
  fmtMoney,
  generateQuoteNumber,
  todayIso,
} from "../utils/quote";
import { submitQuotation } from "../utils/api";
import { Field, ReadOnlyField } from "./Field";
import { FileUploadField } from "./FileUploadField";
import { SuccessScreen } from "./SuccessScreen";

const DEFAULT_GST = 18;

function initialLineRows(lineItems) {
  return lineItems.map((line) => ({
    description: line.description || "",
    deliveryDate: "",
    unitPrice: "",
    gst: String(DEFAULT_GST),
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
  const [lineRows, setLineRows] = useState(() => initialLineRows(lineItems));
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
      if (!row.unitPrice || Number(row.unitPrice) <= 0) {
        e[`unitPrice_${i}`] = "Required";
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
      const pricing = calcLineFromUnitPrice({
        unitPrice: row.unitPrice,
        gstPct: row.gst,
        quantity: line.quantity,
      });

      return {
        itemId: line.itemId,
        itemMasterId: line.itemId,
        product: line.product,
        quantity: line.quantity,
        unit: line.unit,
        vendorRecordId: line.vendorRecordId || rfq.vendorRecordId || "",
        vendorId: line.vendorId || rfq.vendorId || "",
        description: row.description || "",
        deliveryDate: row.deliveryDate || "",
        totalAmount: String(pricing.grandTotal),
        price: String(pricing.unitPrice),
        gst: String(row.gst || DEFAULT_GST),
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
    <div className="page page--wide">
      <header className="page-hero">
        <div className="page-hero__eyebrow">AiraTrex Sourcing Desk</div>
        <div className="brand">
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
        </div>
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

        <section className="card card--table">
          <h2 className="card__title">Items to Quote</h2>
          <div className="items-table-wrap">
            <table className="items-table items-table--quote">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Description</th>
                  <th>Delivery</th>
                  <th>Unit Price *</th>
                  <th>GST %</th>
                  <th>Total</th>
                  <th>Remarks</th>
                  <th>Attachment</th>
                  <th>Datasheet</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((line, i) => (
                  <ItemTableRow
                    key={`${line.itemId}-${i}`}
                    index={i}
                    line={line}
                    row={lineRows[i] || {}}
                    errors={errors}
                    onPatch={(patch) => patchLineRow(i, patch)}
                  />
                ))}
              </tbody>
            </table>
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

function DescriptionField({ value, onChange }) {
  const ref = useRef(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    resize();
  }, [value]);

  return (
    <textarea
      ref={ref}
      className="input input--compact input--cell textarea textarea--description"
      placeholder="Description"
      value={value}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
      onInput={resize}
    />
  );
}

function ItemTableRow({ index, line, row, errors, onPatch }) {
  const pricing = calcLineFromUnitPrice({
    unitPrice: row.unitPrice,
    gstPct: row.gst,
    quantity: line.quantity,
  });

  const fmtShort = (n) =>
    n > 0
      ? Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })
      : "—";

  const showTotal = Number(row.unitPrice) > 0;

  return (
    <tr>
      <td className="items-table__product">
        <strong>{line.product || "—"}</strong>
      </td>
      <td className="items-table__qty">{qtyLabel(line)}</td>
      <td className="items-table__desc">
        <DescriptionField
          value={row.description}
          onChange={(description) => onPatch({ description })}
        />
      </td>
      <td>
        <input
          className="input input--compact input--cell"
          type="date"
          value={row.deliveryDate}
          onChange={(e) => onPatch({ deliveryDate: e.target.value })}
        />
      </td>
      <td>
        <input
          className={`input input--compact input--cell ${errors[`unitPrice_${index}`] ? "input--error" : ""}`}
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={row.unitPrice}
          onChange={(e) => onPatch({ unitPrice: e.target.value })}
        />
      </td>
      <td>
        <input
          className="input input--compact input--cell input--cell-narrow"
          type="number"
          min="0"
          step="0.01"
          placeholder="18"
          value={row.gst}
          onChange={(e) => onPatch({ gst: e.target.value })}
        />
      </td>
      <td className="items-table__calc items-table__calc--total">
        {showTotal ? fmtShort(pricing.grandTotal) : "—"}
      </td>
      <td>
        <input
          className="input input--compact input--cell"
          placeholder="Notes"
          value={row.remarks}
          onChange={(e) => onPatch({ remarks: e.target.value })}
        />
      </td>
      <td>
        <FileUploadField
          label="Attach"
          compact
          file={row.attachment}
          onChange={(file) => onPatch({ attachment: file })}
        />
      </td>
      <td>
        <FileUploadField
          label="Sheet"
          compact
          file={row.datasheet}
          onChange={(file) => onPatch({ datasheet: file })}
        />
      </td>
    </tr>
  );
}

function qtyLabel(line) {
  if (!line.quantity) return "—";
  return `${line.quantity} ${line.unit || ""}`.trim();
}

function GrandTotalPreview({ currency, lineItems, lineRows }) {
  let subtotal = 0;
  let totalGst = 0;

  lineItems.forEach((line, i) => {
    const row = lineRows[i] || {};
    const pricing = calcLineFromUnitPrice({
      unitPrice: row.unitPrice,
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
      <span>Subtotal: {fmtMoney(subtotal, currency)}</span>
      <span>GST: {fmtMoney(totalGst, currency)}</span>
      <strong>Grand total: {fmtMoney(grandTotal, currency)}</strong>
    </div>
  );
}
