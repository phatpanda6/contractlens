"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { RunCheckButton } from "./run-check-button";

type EndpointConfigFormProps = {
  endpointId: string;
  initialName: string;
  initialUrl: string;
};

export function EndpointConfigForm({
  endpointId,
  initialName,
  initialUrl,
}: EndpointConfigFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [url, setUrl] = useState(initialUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedName, setSavedName] = useState(initialName);
  const [savedUrl, setSavedUrl] = useState(initialUrl);

  const trimmedName = name.trim();
  const trimmedUrl = url.trim();
  const hasEmptyField = trimmedName === "" || trimmedUrl === "";
  const hasUnsavedChanges = name !== savedName || url !== savedUrl;

  const isRunDisabled = hasUnsavedChanges || hasEmptyField || isSaving;

  const runDisabledReason = hasUnsavedChanges
    ? "Save your changes before running a check."
    : null;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);

    if (hasEmptyField) {
      setError("Name and URL cannot be empty");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/endpoints/${endpointId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          url: trimmedUrl,
        }),
      });

      if (!response.ok) {
        throw new Error("The endpoint could not be updated");
      }

      setName(trimmedName);
      setUrl(trimmedUrl);
      setSavedName(trimmedName);
      setSavedUrl(trimmedUrl);

      router.refresh();
    } catch (caughtError) {
      console.error("could not update endpoint", caughtError);
      setError("The endpoint could not be updated");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-4 border-t border-stone-100 pt-4"
    >
      <div>
        <p className="text-sm font-medium text-stone-900">Edit endpoint</p>
        <p className="mt-1 text-sm text-stone-500">
          Changing the target keeps the existing baseline.
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="endpoint-name"
          className="block text-sm font-medium text-stone-700"
        >
          Endpoint name
        </label>
        <input
          id="endpoint-name"
          type="text"
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="endpoint-url"
          className="block text-sm font-medium text-stone-700"
        >
          Endpoint URL
        </label>
        <input
          id="endpoint-url"
          type="text"
          name="url"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
        />
      </div>

      <button
        type="submit"
        disabled={isSaving}
        aria-busy={isSaving}
        className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 shadow-sm transition-colors enabled:hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Saving…" : "Save endpoint"}
      </button>
      {error !== null && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <RunCheckButton
        endpointId={endpointId}
        disabled={isRunDisabled}
        disabledReason={runDisabledReason}
      />
    </form>
  );
}
