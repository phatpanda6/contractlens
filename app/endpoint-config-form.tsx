"use client";

import { useState, type SubmitEvent } from "react";
import { RunCheckButton } from "./run-check-button";
import { useEndpointActions } from "./endpoint-actions";
import { UiIcon } from "./ui-icon";

type EndpointConfigFormProps = {
  endpointId: string;
  initialName: string;
  initialUrl: string;
  method: string;
  isHostedDemoMode: boolean;
};

export function EndpointConfigForm({
  endpointId,
  initialName,
  initialUrl,
  method,
  isHostedDemoMode,
}: EndpointConfigFormProps) {
  const [name, setName] = useState(initialName);
  const [url, setUrl] = useState(initialUrl);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState({ name: initialName, url: initialUrl });
  const {
    pendingAction,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    performAction,
  } = useEndpointActions();

  // The saved API result updates these props. Preserve an unfinished draft
  // if the server data changes, and keep saved values separate from inputs.
  if (saved.name !== initialName || saved.url !== initialUrl) {
    setSaved({ name: initialName, url: initialUrl });
    if (!hasUnsavedChanges) {
      setName(initialName);
      setUrl(initialUrl);
    }
  }

  const isBusy = pendingAction !== null;
  const isSaving = pendingAction === "save";
  const hasEmptyField = name.trim() === "" || url.trim() === "";

  function saveEndpoint(nextName: string, nextUrl: string) {
    setError(null);
    if (!nextName.trim() || !nextUrl.trim()) {
      setError("Name and URL cannot be empty");
      return;
    }
    performAction("save", async () => {
      try {
        const response = await fetch(`/api/endpoints/${endpointId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nextName.trim(), url: nextUrl.trim() }),
        });
        if (!response.ok) {
          let message = "The endpoint could not be updated";
          try {
            const body: unknown = await response.json();
            if (
              typeof body === "object" &&
              body !== null &&
              "error" in body &&
              typeof body.error === "string"
            )
              message = body.error;
          } catch {
            /* Keep the readable fallback for a non-JSON error. */
          }
          throw new Error(message);
        }
        setName(nextName.trim());
        setUrl(nextUrl.trim());
        setHasUnsavedChanges(false);
        return await response.json();
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "The endpoint could not be updated",
        );
        return null;
      }
    });
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    saveEndpoint(name, url);
  }

  function cancelEdit() {
    setName(initialName);
    setUrl(initialUrl);
    setError(null);
    setHasUnsavedChanges(false);
    setIsEditing(false);
  }

  return (
    <section className="endpoint-card" aria-label="Endpoint configuration">
      <div className="endpoint-toolbar">
        <div className="endpoint-identity">
          <div className="endpoint-name">
            <span className="method-badge">{method}</span>
            <h2>{initialName}</h2>
          </div>
          <code className="endpoint-address">{initialUrl}</code>
        </div>
        <div
          className="endpoint-shortcuts"
          role="group"
          aria-label="Choose and save a demo endpoint"
        >
          {(
            [
              ["v1", "Original response"],
              ["v2", "Changed response"],
            ] as const
          ).map(([version, label]) => (
            <button
              type="button"
              key={version}
              aria-pressed={initialUrl === `/api/demo/products/${version}`}
              disabled={isBusy || hasUnsavedChanges}
              onClick={() =>
                saveEndpoint(initialName, `/api/demo/products/${version}`)
              }
            >
              <span>{label}</span> <code>{version}</code>
            </button>
          ))}
        </div>
        <div className="endpoint-buttons">
          <button
            type="button"
            className="button button-quiet"
            aria-expanded={isEditing}
            aria-controls="endpoint-editor"
            disabled={isBusy}
            onClick={() => setIsEditing(!isEditing)}
          >
            <UiIcon name="edit" />
            Edit endpoint
          </button>
          <RunCheckButton
            endpointId={endpointId}
            disabled={hasUnsavedChanges || hasEmptyField}
          />
        </div>
      </div>
      <div id="endpoint-editor" hidden={!isEditing}>
        <form onSubmit={handleSubmit} className="endpoint-editor">
          <p className="editor-intro">
            Changing the target keeps the existing baseline and check history.
          </p>
          <div className="field">
            <label htmlFor="endpoint-name">Endpoint name</label>
            <input
              id="endpoint-name"
              name="name"
              value={name}
              disabled={isBusy}
              onChange={(event) => {
                setName(event.target.value);
                setHasUnsavedChanges(
                  event.target.value !== initialName || url !== initialUrl,
                );
                setError(null);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="endpoint-url">Endpoint URL</label>
            <input
              id="endpoint-url"
              name="url"
              type="text"
              spellCheck={false}
              autoCapitalize="none"
              aria-describedby="endpoint-url-guidance"
              value={url}
              disabled={isBusy}
              onChange={(event) => {
                setUrl(event.target.value);
                setHasUnsavedChanges(
                  name !== initialName || event.target.value !== initialUrl,
                );
                setError(null);
              }}
            />
            <p id="endpoint-url-guidance">
              {isHostedDemoMode
                ? "Hosted demo: use /api/demo/products/v1 or /api/demo/products/v2. Local and self-hosted installations also support public HTTPS JSON APIs."
                : "Use a demo route or a public HTTPS endpoint that returns JSON."}
            </p>
          </div>
          <div className="editor-actions">
            <button
              className="button button-secondary"
              type="submit"
              disabled={isBusy}
              aria-busy={isSaving}
            >
              {isSaving ? "Saving…" : "Save endpoint"}
            </button>
            <button
              className="button button-quiet"
              type="button"
              disabled={isBusy}
              onClick={cancelEdit}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      {hasUnsavedChanges && (
        <p className="toolbar-message">
          Save your changes before running a check.
        </p>
      )}
      <p className="sr-only" role="status">
        {isSaving ? "Saving endpoint…" : ""}
      </p>
      {isSaving && <p className="toolbar-message">Saving endpoint…</p>}
      {error !== null && (
        <p role="alert" className="toolbar-message error-text">
          {error}
        </p>
      )}
    </section>
  );
}
