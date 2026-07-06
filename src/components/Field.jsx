export function Field({ label, required, children, hint }) {
  return (
    <label className="field">
      <span className="field__label">
        {label} {required && <em className="req">*</em>}
      </span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function ReadOnlyField({ label, value }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input className="input input--locked" value={value || "—"} readOnly tabIndex={-1} />
    </label>
  );
}
