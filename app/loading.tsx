import { UiIcon } from "./ui-icon";

export default function Loading() {
  return (
    <div className="app-shell" aria-busy="true">
      <header className="app-header">
        <div className="header-inner">
          <span className="brand">
            <span className="brand-icon">
              <UiIcon name="lens" width="25" height="25" />
            </span>
            ContractLens
          </span>
        </div>
      </header>
      <main className="workspace">
        <div role="status" className="loading-message">
          <h1>Opening your workspace</h1>
          <p>Loading the saved endpoint, comparison, and recent checks…</p>
        </div>
        <div aria-hidden="true" className="loading-preview">
          <div className="loading-bar" />
          <div className="loading-row" />
          <div className="loading-row" />
          <div className="loading-columns">
            <div />
            <div />
          </div>
        </div>
      </main>
    </div>
  );
}
