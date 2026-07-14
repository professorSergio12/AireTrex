import { useId } from "react";

export function FileUploadField({
  label,
  file = null,
  files = null,
  onChange,
  accept,
  compact = false,
  multiple = false,
}) {
  const id = useId();
  const selectedFiles = multiple ? files || [] : file ? [file] : [];
  const hasFiles = selectedFiles.length > 0;

  function handleChange(e) {
    const picked = Array.from(e.target.files || []);
    if (multiple) {
      onChange(picked);
      return;
    }
    onChange(picked[0] || null);
  }

  function clearFiles() {
    onChange(multiple ? [] : null);
  }

  const summary = multiple
    ? `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"}`
    : selectedFiles[0]?.name;

  return (
    <div className={`file-upload ${compact ? "file-upload--compact" : ""}`}>
      <input
        id={id}
        className="file-upload__input"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
      />
      <label
        htmlFor={id}
        className={`file-upload__btn ${hasFiles ? "file-upload__btn--done" : ""}`}
        title={hasFiles ? summary : label}
      >
        {hasFiles ? (
          <>
            <span className="file-upload__check" aria-hidden="true">
              ✓
            </span>
            <span className="file-upload__name">{compact ? "Added" : summary}</span>
          </>
        ) : (
          <>+ {label}</>
        )}
      </label>
      {hasFiles && !compact && (
        <button type="button" className="file-upload__clear" onClick={clearFiles}>
          Remove
        </button>
      )}
      {hasFiles && compact && (
        <button
          type="button"
          className="file-upload__clear file-upload__clear--icon"
          onClick={clearFiles}
          title="Remove files"
        >
          ×
        </button>
      )}
      {multiple && hasFiles && !compact && (
        <ul className="file-upload__list">
          {selectedFiles.map((f) => (
            <li key={`${f.name}-${f.size}-${f.lastModified}`}>{f.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
