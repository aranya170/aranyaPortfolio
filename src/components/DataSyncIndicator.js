import React, { useEffect, useState } from "react";
import { usePortfolio } from "../context/PortfolioContext";
import "../styles/DataSyncIndicator.css";

// The Render backend can take 30s+ to wake from sleep. Instead of blocking the
// page, show the preload content right away with a small, non-blocking status
// pill and a progress bar, then confirm once fresh data has arrived.
const SLOW_AFTER_MS = 6000;
const DONE_VISIBLE_MS = 2200;

export default function DataSyncIndicator() {
  const { loading, isBackendOnline } = usePortfolio();
  const [isSlow, setIsSlow] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!loading) return undefined;
    const timer = setTimeout(() => setIsSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (loading) return undefined;
    const timer = setTimeout(() => setVisible(false), DONE_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  if (!visible) return null;

  let state = "loading";
  let message = isSlow ? "Waking up the server, hang tight…" : "Fetching the latest updates…";
  if (!loading) {
    state = isBackendOnline ? "done" : "offline";
    message = isBackendOnline ? "Up to date" : "Showing saved content";
  }

  return (
    <>
      {loading && <div className="sync-progress" aria-hidden="true" />}
      <div
        className={`sync-pill sync-${state}${loading ? "" : " sync-leaving"}`}
        role="status"
        aria-live="polite"
      >
        {state === "loading" ? (
          <span className="sync-spinner" aria-hidden="true" />
        ) : (
          <span className="sync-dot" aria-hidden="true" />
        )}
        <span>{message}</span>
      </div>
    </>
  );
}
