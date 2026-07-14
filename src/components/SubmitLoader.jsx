import { useEffect } from "react";

export function SubmitLoader({ message = "Submitting your quotation…" }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="submit-loader" role="alert" aria-live="assertive" aria-busy="true">
      <div className="submit-loader__panel">
        <div className="submit-loader__spinner" aria-hidden="true" />
        <p className="submit-loader__title">{message}</p>
        <p className="submit-loader__hint">Please wait — do not close or refresh this page.</p>
      </div>
    </div>
  );
}
