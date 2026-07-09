import { useId } from "react";

export function FileUploadField({ label, file, onChange, accept }) {
  const id = useId();

  return (
    <div className="file-upload">
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
      >
        {file ? (
          <>
            <span className="file-upload__check" aria-hidden="true">
              ✓
            </span>
            <span className="file-upload__name" title={file.name}>
              {file.name}
            </span>
          </>
        ) : (
          <>+ {label}</>
        )}
      </label>
      {file && (
        <button
          type="button"
          className="file-upload__clear"
          onClick={() => onChange(null)}
        >
          Remove
        </button>
      )}
    </div>
  );
}
