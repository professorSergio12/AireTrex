import { useEffect, useRef } from "react";

export function DescriptionPopup({ title, value, readOnly, onChange, onClose }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    if (!readOnly) el.setSelectionRange(el.value.length, el.value.length);
  }, [readOnly]);

  return (
    <div
      className="desc-popup__overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="desc-popup" role="dialog" aria-modal="true" aria-label={title}>
        <div className="desc-popup__header">
          <span className="desc-popup__title">{title}</span>
          <button type="button" className="desc-popup__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <textarea
          ref={textareaRef}
          className={`desc-popup__textarea ${readOnly ? "desc-popup__textarea--locked" : ""}`}
          value={value}
          readOnly={readOnly}
          onChange={(e) => {
            if (!readOnly) onChange(e.target.value);
          }}
        />
        <div className="desc-popup__footer">
          <button type="button" className="btn btn--primary desc-popup__done" onClick={onClose}>
            {readOnly ? "Close" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
