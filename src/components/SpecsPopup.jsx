import { useEffect } from "react";

export function SpecsPopup({ specs, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="desc-popup__overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="desc-popup" role="dialog" aria-modal="true" aria-label="Specifications">
        <div className="desc-popup__header">
          <span className="desc-popup__title">Specifications</span>
          <button type="button" className="desc-popup__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div
          className="specs-popup__list"
          style={{ gridTemplateColumns: `repeat(${specs.length}, 1fr)` }}
        >
          {specs.map((spec) => (
            <div className="specs-popup__row" key={spec.label}>
              <span className="specs-popup__label">{spec.label}</span>
              <span className="specs-popup__value">{spec.value}</span>
            </div>
          ))}
        </div>
        <div className="desc-popup__footer">
          <button type="button" className="btn btn--primary desc-popup__done" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
