import { useId, useRef } from "react";

function fileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function mergeFiles(existing, incoming) {
  const seen = new Set(existing.map(fileKey));
  const merged = [...existing];
  for (const file of incoming) {
    const key = fileKey(file);
    if (!seen.has(key)) {
      merged.push(file);
      seen.add(key);
    }
  }
  return merged;
}

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
  const inputRef = useRef(null);
  const selectedFiles = multiple ? files || [] : file ? [file] : [];
  const hasFiles = selectedFiles.length > 0;

  function handleChange(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (multiple) {
      onChange(mergeFiles(selectedFiles, picked));
      return;
    }
    onChange(picked[0] || null);
  }

  function clearFiles() {
    onChange(multiple ? [] : null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(target) {
    if (!multiple) {
      clearFiles();
      return;
    }
    onChange(selectedFiles.filter((f) => fileKey(f) !== fileKey(target)));
  }

  if (multiple && !compact) {
    return (
      <div className="file-upload file-upload--multi">
        <input
          ref={inputRef}
          id={id}
          className="file-upload__input"
          type="file"
          accept={accept}
          onChange={handleChange}
        />

        {hasFiles ? (
          <>
            <ul className="file-upload__list">
              {selectedFiles.map((f) => (
                <li key={fileKey(f)} className="file-upload__item">
                  <span className="file-upload__item-name" title={f.name}>
                    {f.name}
                  </span>
                  <button
                    type="button"
                    className="file-upload__item-remove"
                    onClick={() => removeFile(f)}
                    aria-label={`Remove ${f.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="file-upload__actions">
              <label htmlFor={id} className="file-upload__btn file-upload__btn--add">
                + Add another
              </label>
              <button type="button" className="file-upload__clear" onClick={clearFiles}>
                Clear all
              </button>
            </div>
          </>
        ) : (
          <label htmlFor={id} className="file-upload__btn">
            + {label}
          </label>
        )}
      </div>
    );
  }

  const summary = selectedFiles[0]?.name;

  return (
    <div className={`file-upload ${compact ? "file-upload--compact" : ""}`}>
      <input
        ref={inputRef}
        id={id}
        className="file-upload__input"
        type="file"
        accept={accept}
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
          title="Remove file"
        >
          ×
        </button>
      )}
    </div>
  );
}
