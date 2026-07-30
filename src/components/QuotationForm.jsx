import { useEffect, useMemo, useRef, useState } from "react";
import { CONFIG } from "../config";
import { getRfqParams, resolveLineItems, resolveUid, enrichLineItemsWithCatalog, normalizeSpacedText } from "../utils/params";
import {
  calcLineFromUnitPrice,
  defaultGstForCurrency,
  fmtMoney,
  generateQuoteNumber,
  parseGstPct,
  todayIso,
} from "../utils/quote";
import { submitQuotation } from "../utils/api";
import { formatDueDateDisplay, isDueDatePassed } from "../utils/deadline";
import { Field, ReadOnlyField } from "./Field";
import { FileUploadField } from "./FileUploadField";
import { SuccessScreen } from "./SuccessScreen";
import { SubmitLoader } from "./SubmitLoader";

function normalizeProductName(value) {
  return String(value ?? "").trim();
}

function productsEqual(a, b) {
  return normalizeProductName(a).toLowerCase() === normalizeProductName(b).toLowerCase();
}

function initialLineRows(lineItems, currency = "INR") {
  const gstDefault = String(defaultGstForCurrency(currency));
  return lineItems.map((line) => ({
    product: line.product || "",
    description: normalizeSpacedText(line.description || ""),
    mainCategory: line.mainCategory || "",
    productType: line.productType || "",
    brand: line.brand || "",
    spec1: line.spec1 || "",
    spec2: line.spec2 || "",
    spec3: line.spec3 || "",
    spec4: line.spec4 || "",
    availableQuantity: "",
    deliveryDate: "",
    unitPrice: "",
    gst: gstDefault,
    remarks: "",
  }));
}

export function QuotationForm() {
  const rfq = useMemo(() => getRfqParams(), []);
  const [lineItems, setLineItems] = useState(() => resolveLineItems(rfq));
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
    attachments: [],
    datasheets: [],
  });
  const [lineRows, setLineRows] = useState(() =>
    initialLineRows(resolveLineItems(rfq), rfq.currency || "INR")
  );
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [errMsg, setErrMsg] = useState("");
  const [submittedVersion, setSubmittedVersion] = useState("");
  const removedItemIdsRef = useRef(new Set());
  const currencyRef = useRef(form.currency);
  currencyRef.current = form.currency;
  const [deadlineState, setDeadlineState] = useState({
    loading: Boolean(rfq.rfqNumber && !rfq.dueDate),
    dueDate: rfq.dueDate || "",
    blocked: isDueDatePassed(rfq.dueDate),
  });

  const linkValid = Boolean(rfq.rfqNumber && lineItems.length > 0);
  const dueDateLabel = deadlineState.dueDate
    ? formatDueDateDisplay(deadlineState.dueDate)
    : "";
  const submissionClosed = deadlineState.blocked;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function removeLineItem(index) {
    if (lineItems.length <= 1) return;
    const id = String(lineItems[index]?.itemId || "").trim();
    if (id) removedItemIdsRef.current.add(id);
    setLineItems((items) => items.filter((_, i) => i !== index));
    setLineRows((rows) => rows.filter((_, i) => i !== index));
    setErrors({});
  }

  useEffect(() => {
    const base = resolveLineItems(rfq);
    // Always pull Creator line items when RFQ is known so specs/category fill
    // even if the email URL omitted them.
    if (!rfq.rfqNumber || CONFIG.MOCK_MODE) {
      return undefined;
    }

    const params = new URLSearchParams();
    if (rfq.rfqNumber) params.set("rfq_no", rfq.rfqNumber);
    if (rfq.rfqRecordId) params.set("rfq_rid", rfq.rfqRecordId);

    let cancelled = false;
    fetch(`${CONFIG.LINE_ITEMS_URL}?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.ok || !Array.isArray(data.items) || !data.items.length) {
          console.warn("[RFQ] line-items enrich skipped:", data?.reason || data?.message || "empty");
          return;
        }
        const enriched = enrichLineItemsWithCatalog(base, data.items).filter((line) => {
          const id = String(line.itemId || "").trim();
          return !id || !removedItemIdsRef.current.has(id);
        });
        if (!enriched.length) return;
        setLineItems(enriched);
        setLineRows(initialLineRows(enriched, currencyRef.current));
      })
      .catch((err) => {
        console.warn("[RFQ] line-items enrich failed:", err?.message || err);
      });

    return () => {
      cancelled = true;
    };
  }, [rfq]);

  useEffect(() => {
    if (!rfq.rfqNumber || rfq.dueDate || CONFIG.MOCK_MODE) return undefined;

    const params = new URLSearchParams();
    if (rfq.rfqNumber) params.set("rfq_no", rfq.rfqNumber);
    if (rfq.rfqRecordId) params.set("rfq_rid", rfq.rfqRecordId);

    let cancelled = false;
    fetch(`${CONFIG.DEADLINE_URL}?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.ok) return;
        const dueDate = data.dueDate || "";
        setDeadlineState({
          loading: false,
          dueDate,
          blocked: dueDate ? !data.allowed : false,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setDeadlineState((prev) => ({ ...prev, loading: false }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [rfq.rfqNumber, rfq.rfqRecordId, rfq.dueDate]);

  function patchLineRow(index, patch) {
    setLineRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function validate() {
    const e = {};
    lineRows.forEach((row, i) => {
      if (!normalizeProductName(row.product)) {
        e[`product_${i}`] = "Required";
      }
      if (!row.unitPrice || Number(row.unitPrice) <= 0) {
        e[`unitPrice_${i}`] = "Required";
      }
      if (row.availableQuantity === "" || row.availableQuantity == null || Number(row.availableQuantity) < 0) {
        e[`availableQuantity_${i}`] = "Required";
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    if (submissionClosed) return;
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

      const originalProduct = normalizeProductName(line.product);
      const product = normalizeProductName(row.product) || originalProduct;
      const productEdited = !productsEqual(product, originalProduct);

      return {
        itemId: line.itemId,
        itemMasterId: line.itemId,
        product,
        originalProduct,
        productEdited,
        actualProductName: product,
        quantity: line.quantity,
        unit: line.unit,
        vendorRecordId: line.vendorRecordId || rfq.vendorRecordId || "",
        vendorId: line.vendorId || rfq.vendorId || "",
        description: row.description || "",
        mainCategory: row.mainCategory || "",
        productType: row.productType || "",
        brand: row.brand || "",
        spec1: row.spec1 || "",
        spec2: row.spec2 || "",
        spec3: row.spec3 || "",
        spec4: row.spec4 || "",
        availableQuantity: row.availableQuantity,
        deliveryDate: row.deliveryDate || "",
        totalAmount: String(pricing.grandTotal),
        price: String(pricing.unitPrice),
        gst: String(parseGstPct(row.gst, defaultGstForCurrency(form.currency))),
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

    const files = {
      attachment: form.attachments,
      datasheet: form.datasheets,
    };

    try {
      const result = await submitQuotation(payload, files);
      if (result.uploadWarning) {
        setErrMsg(`Quotation saved, but file upload failed: ${result.uploadWarning}`);
        setStatus("error");
        return;
      }
      setSubmittedVersion(result.quotationVersion || "");
      setStatus("done");
    } catch (err) {
      console.error(err);
      if (err.code === "DUE_DATE_PASSED") {
        setDeadlineState((prev) => ({
          ...prev,
          blocked: true,
          dueDate: err.dueDate || prev.dueDate,
        }));
      }
      setErrMsg(err.message || "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <SuccessScreen
        rfq={rfq}
        uniqueId={uniqueId}
        itemCount={lineItems.length}
        lineItems={lineItems}
        quotationVersion={submittedVersion}
      />
    );
  }

  const hasFiles = form.attachments.length > 0 || form.datasheets.length > 0;
  const submitting = status === "submitting";

  return (
    <div className="page page--wide">
      {submitting && (
        <SubmitLoader
          message={
            hasFiles
              ? "Submitting quotation and uploading files…"
              : "Submitting your quotation…"
          }
        />
      )}
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

      {submissionClosed && (
        <div className="alert alert--error">
          The quotation due date{dueDateLabel ? ` (${dueDateLabel})` : ""} has passed. Submissions
          are closed for this RFQ.
        </div>
      )}

      {!submissionClosed && dueDateLabel && (
        <div className="alert alert--info">
          Please submit your quotation on or before <strong>{dueDateLabel}</strong>.
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className={submitting ? "form--submitting" : ""}>
        <section className="card">
          <h2 className="card__title">RFQ Reference</h2>
          <div className="grid grid-3">
            <ReadOnlyField label="RFQ #" value={rfq.rfqNumber} />
            <ReadOnlyField
              label="Line Items"
              value={multiItem ? `${lineItems.length} items` : lineItems[0]?.product}
            />
            <ReadOnlyField label="Vendor" value={rfq.vendorName || rfq.vendorId} />
            <ReadOnlyField
              label="Due Date"
              value={deadlineState.loading ? "Checking…" : dueDateLabel || "—"}
            />
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
              <select
                className="input"
                value={form.currency}
                onChange={(e) => {
                  const currency = e.target.value;
                  const gstDefault = String(defaultGstForCurrency(currency));
                  setForm((f) => ({ ...f, currency }));
                  setLineRows((rows) => rows.map((row) => ({ ...row, gst: gstDefault })));
                }}
              >
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
          <p className="card__hint">
            If you do not stock an item, remove that row before submitting. At least one item is required.
          </p>
          <div className="items-table-wrap">
            <table className="items-table items-table--quote">
              <thead>
                <tr>
                  <th className="items-table__product">Actual Product Name</th>
                  <th className="items-table__qty">Required Qty</th>
                  <th className="items-table__avail-qty">Available Qty *</th>
                  <th className="items-table__cat">Main Category</th>
                  <th className="items-table__type">Product Type</th>
                  <th className="items-table__spec">Spec 1</th>
                  <th className="items-table__spec">Spec 2</th>
                  <th className="items-table__spec">Spec 3</th>
                  <th className="items-table__spec">Spec 4</th>
                  <th className="items-table__brand">Brand</th>
                  <th className="items-table__desc">Product Description</th>
                  <th className="items-table__delivery">Delivery Date</th>
                  <th className="items-table__price">Unit Price *</th>
                  <th className="items-table__gst">GST %</th>
                  <th className="items-table__total">Total</th>
                  <th className="items-table__remarks">Remarks</th>
                  <th className="items-table__remove" aria-label="Remove">Remove</th>
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
                    canRemove={lineItems.length > 1}
                    onRemove={() => removeLineItem(i)}
                    onPatch={(patch) => patchLineRow(i, patch)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <GrandTotalPreview currency={form.currency} lineItems={lineItems} lineRows={lineRows} />
        </section>

        <section className="card">
          <h2 className="card__title">Documents</h2>
          <p className="card__hint">
            Add one or more files per field. After the first file, use &quot;Add another&quot; to attach more.
          </p>
          <div className="grid grid-2 documents-grid">
            <Field label="Attachments">
              <FileUploadField
                label="Add attachment"
                multiple
                files={form.attachments}
                onChange={(attachments) =>
                  setForm((f) => ({ ...f, attachments: attachments || [] }))
                }
              />
            </Field>
            <Field label="Datasheets">
              <FileUploadField
                label="Add datasheet"
                multiple
                files={form.datasheets}
                onChange={(datasheets) =>
                  setForm((f) => ({ ...f, datasheets: datasheets || [] }))
                }
              />
            </Field>
          </div>
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
            disabled={submitting || !linkValid || submissionClosed || deadlineState.loading}
          >
            {submitting
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

function DescriptionField({ value, onChange, placeholder = "Description", className = "", error = false, "aria-label": ariaLabel }) {
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
      className={`input input--compact input--cell textarea textarea--description ${error ? "input--error" : ""} ${className}`.trim()}
      placeholder={placeholder}
      value={value}
      rows={1}
      title={value || undefined}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      onInput={resize}
    />
  );
}

function ItemTableRow({ index, line, row, errors, onPatch, canRemove, onRemove }) {
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
  const productValue = row.product ?? line.product ?? "";

  return (
    <tr>
      <td className="items-table__product">
        <DescriptionField
          className="textarea--product"
          placeholder="Actual Product Name"
          value={productValue}
          error={Boolean(errors[`product_${index}`])}
          aria-label={`Actual Product Name ${index + 1}`}
          onChange={(product) => onPatch({ product })}
        />
      </td>
      <td className="items-table__qty">
        <input
          className="input input--compact input--cell input--cell-narrow input--locked"
          type="text"
          readOnly
          tabIndex={-1}
          value={qtyLabel(line)}
          aria-label={`Required Qty ${index + 1}`}
        />
      </td>
      <td className="items-table__avail-qty">
        <input
          className={`input input--compact input--cell input--cell-narrow ${errors[`availableQuantity_${index}`] ? "input--error" : ""}`}
          type="number"
          min="0"
          step="1"
          placeholder="0"
          value={row.availableQuantity}
          onChange={(e) => onPatch({ availableQuantity: e.target.value })}
        />
      </td>
      <td className="items-table__cat">
        <input
          className="input input--compact input--cell"
          type="text"
          placeholder="Main Category"
          value={row.mainCategory ?? line.mainCategory ?? ""}
          onChange={(e) => onPatch({ mainCategory: e.target.value })}
          aria-label={`Main Category row ${index + 1}`}
        />
      </td>
      <td className="items-table__type">
        <input
          className="input input--compact input--cell"
          type="text"
          placeholder="Product Type"
          value={row.productType ?? line.productType ?? ""}
          onChange={(e) => onPatch({ productType: e.target.value })}
          aria-label={`Product Type row ${index + 1}`}
        />
      </td>
      <td className="items-table__spec">
        <input
          className="input input--compact input--cell"
          type="text"
          placeholder="Spec 1"
          value={row.spec1 ?? line.spec1 ?? ""}
          onChange={(e) => onPatch({ spec1: e.target.value })}
          aria-label={`Spec 1 row ${index + 1}`}
        />
      </td>
      <td className="items-table__spec">
        <input
          className="input input--compact input--cell"
          type="text"
          placeholder="Spec 2"
          value={row.spec2 ?? line.spec2 ?? ""}
          onChange={(e) => onPatch({ spec2: e.target.value })}
          aria-label={`Spec 2 row ${index + 1}`}
        />
      </td>
      <td className="items-table__spec">
        <input
          className="input input--compact input--cell"
          type="text"
          placeholder="Spec 3"
          value={row.spec3 ?? line.spec3 ?? ""}
          onChange={(e) => onPatch({ spec3: e.target.value })}
          aria-label={`Spec 3 row ${index + 1}`}
        />
      </td>
      <td className="items-table__spec">
        <input
          className="input input--compact input--cell"
          type="text"
          placeholder="Spec 4"
          value={row.spec4 ?? line.spec4 ?? ""}
          onChange={(e) => onPatch({ spec4: e.target.value })}
          aria-label={`Spec 4 row ${index + 1}`}
        />
      </td>
      <td className="items-table__brand">
        <input
          className="input input--compact input--cell"
          type="text"
          placeholder="Brand"
          value={row.brand ?? line.brand ?? ""}
          onChange={(e) => onPatch({ brand: e.target.value })}
          aria-label={`Brand row ${index + 1}`}
        />
      </td>
      <td className="items-table__desc">
        <DescriptionField
          placeholder="Product Description"
          value={row.description}
          onChange={(description) => onPatch({ description })}
          aria-label={`Product Description ${index + 1}`}
        />
      </td>
      <td className="items-table__delivery">
        <input
          className="input input--compact input--cell"
          type="date"
          value={row.deliveryDate}
          onChange={(e) => onPatch({ deliveryDate: e.target.value })}
        />
      </td>
      <td className="items-table__price">
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
      <td className="items-table__gst">
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
      <td className="items-table__total">
        <input
          className="input input--compact input--cell input--locked"
          type="text"
          readOnly
          tabIndex={-1}
          value={showTotal ? fmtShort(pricing.grandTotal) : "—"}
          aria-label={`Total row ${index + 1}`}
        />
      </td>
      <td className="items-table__remarks">
        <input
          className="input input--compact input--cell"
          placeholder="Notes"
          value={row.remarks}
          onChange={(e) => onPatch({ remarks: e.target.value })}
        />
      </td>
      <td className="items-table__remove">
        <button
          type="button"
          className="btn-remove-row"
          disabled={!canRemove}
          title={canRemove ? "Remove this item" : "At least one item is required"}
          aria-label={`Remove item ${index + 1}`}
          onClick={onRemove}
        >
          Remove
        </button>
      </td>
    </tr>
  );
}

function qtyLabel(line) {
  if (line.quantity === "" || line.quantity == null) return "—";
  return String(line.quantity);
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
      <strong>Subtotal: {fmtMoney(subtotal, currency)}</strong>
      <strong>GST: {fmtMoney(totalGst, currency)}</strong>
      <strong>Grand total: {fmtMoney(grandTotal, currency)}</strong>
    </div>
  );
}
