"use client";

import { useState, type ReactNode } from "react";
import { UiIcon } from "./ui-icon";

export function ResponseView({
  responses,
  schemas,
}: {
  responses: ReactNode;
  schemas: ReactNode;
}) {
  const [view, setView] = useState("response");

  return (
    <section className="response-section" aria-labelledby="response-heading">
      <div className="section-toolbar">
        <h3 id="response-heading" tabIndex={-1}>
          <UiIcon name="code" /> Comparison evidence
        </h3>
        <fieldset className="view-switch">
          <legend className="sr-only">Evidence view</legend>
          {["response", "schema"].map((option) => (
            <label key={option}>
              <input
                type="radio"
                name="evidence-view"
                value={option}
                checked={view === option}
                onChange={() => setView(option)}
                className="sr-only"
              />
              <span>{option === "response" ? "Response" : "Schema"}</span>
            </label>
          ))}
        </fieldset>
      </div>
      <div className="response-grid">
        {view === "response" ? responses : schemas}
      </div>
      <p className="evidence-note">
        The saved baseline reflects your current contract. Accepting a response
        updates it; the recorded check above stays unchanged.
      </p>
    </section>
  );
}
