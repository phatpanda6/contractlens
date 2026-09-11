// Render tokens as React text, never HTML from an endpoint response.
function highlightLine(line: string) {
  return line
    .split(
      /("(?:\\.|[^"\\])*"\s*:|"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/g,
    )
    .map((token, index) => {
      let kind = "json-punctuation";
      if (/^".*:\s*$/.test(token)) kind = "json-key";
      else if (token.startsWith('"')) kind = "json-string";
      else if (/^(true|false|null)$/.test(token)) kind = "json-literal";
      else if (/^-?\d/.test(token)) kind = "json-number";
      return (
        <span className={kind} key={index}>
          {token}
        </span>
      );
    });
}

export function JsonPanel({
  title,
  label,
  value,
  emptyMessage,
}: {
  title: string;
  label: string;
  value: unknown;
  emptyMessage: string;
}) {
  const lines =
    value === null ? [] : (JSON.stringify(value, null, 2) ?? "").split("\n");
  const isTruncated =
    lines.length > 200 || lines.some((line) => line.length > 2000);

  return (
    <section className="json-panel" aria-label={title}>
      <div className="json-header">
        <h4>{title}</h4>
        <span>{label}</span>
      </div>
      {value === null ? (
        <p className="json-empty">{emptyMessage}</p>
      ) : (
        <pre tabIndex={0} aria-label={`${title} JSON`}>
          <code>
            {lines.slice(0, 200).map((line, index) => (
              <span className="json-line" key={index}>
                {highlightLine(line.slice(0, 2000))}
                {index < Math.min(lines.length, 200) - 1 ? "\n" : ""}
              </span>
            ))}
          </code>
        </pre>
      )}
      {isTruncated && (
        <p className="json-preview-note">
          Preview limited to 200 lines and 2,000 characters per line. The
          complete response is preserved in the saved check.
        </p>
      )}
    </section>
  );
}
