import { useId } from "react";

export function FileUploadField({ label, file, onChange, accept, compact = false }) {
  const id = useId();

  return (
    <div className={`file-upload ${compact ? "file-upload--compact" : ""}`}>
      <input
        id={id}
        className="file-upload__input"
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <label
        htmlFor={id}
        className={`file-upload__btn ${file ? "file-upload__btn--done" : ""}`}
        title={file ? file.name : label}
      >
        {file ? (
          <>
            <span className="file-upload__check" aria-hidden="true">
              ✓
            </span>
            <span className="file-upload__name">{compact ? "Added" : file.name}</span>
          </>
        ) : (
          <>+ {label}</>
        )}
      </label>
      {file && !compact && (
        <button
          type="button"
          className="file-upload__clear"
          onClick={() => onChange(null)}
        >
          Remove
        </button>
      )}
      {file && compact && (
        <button
          type="button"
          className="file-upload__clear file-upload__clear--icon"
          onClick={() => onChange(null)}
          title="Remove file"
        >
          ×
        </button>
      )}
    </div>
  );
}
