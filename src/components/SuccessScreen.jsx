export function SuccessScreen({ rfq, uniqueId, itemCount = 1, quotationVersion = "", softWarning = "" }) {
  const multi = itemCount > 1;
  return (
    <div className="page">
      <header className="page-hero">
        <div className="page-hero__eyebrow">AiraTrex Sourcing Desk</div>
        <div className="brand">
          <div className="brand__logo">AT</div>
          <div>
            <h1>Quotation Submitted</h1>
            <p>Your response has been received successfully.</p>
          </div>
        </div>
      </header>
      {softWarning ? <div className="alert alert--warn">{softWarning}</div> : null}
      <div className="card success">
        <div className="success__check">&#10003;</div>
        <h1>Thank you{rfq.vendorName ? `, ${rfq.vendorName}` : ""}</h1>
        <p>
          Your quotation
          {multi ? (
            <>
              {" "}
              for <strong>{itemCount} items</strong>
            </>
          ) : (
            <>
              {" "}
              for <strong>{rfq.product || "the requested item"}</strong>
            </>
          )}{" "}
          has been received by the AiraTrex Sourcing Desk.
        </p>
        <div className="success__ref">
          <div>
            <span>RFQ #</span>
            <strong>{rfq.rfqNumber || "—"}</strong>
          </div>
          <div>
            <span>{multi ? "Items" : "Item"}</span>
            <strong>{multi ? itemCount : rfq.itemId || "—"}</strong>
          </div>
          <div>
            <span>Reference</span>
            <strong>{uniqueId || "—"}</strong>
          </div>
          {quotationVersion ? (
            <div>
              <span>Version</span>
              <strong>{quotationVersion}</strong>
            </div>
          ) : null}
        </div>
        <p className="muted">You may now close this window.</p>
      </div>
    </div>
  );
}
