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
          <svg className="sync-windmill" viewBox="0 0 248 248" aria-hidden="true">
            <path
              fill="currentColor"
              d="M152.266 123.716h94.275c.802 0 1.459.656 1.459 1.459v121.067c0 .81-.664 1.474-1.474 1.466-67.274-.78-121.669-55.137-122.522-122.387v121.22c0 .803-.657 1.459-1.46 1.459H1.474c-.81 0-1.474-.664-1.467-1.474C.795 178.721 56 124.008 123.996 124H1.459C.657 124 0 123.344 0 122.541V1.474C0 .664.664 0 1.474.008c67.274.78 121.669 55.137 122.522 122.387V1.46c0-.803.657-1.46 1.46-1.46h121.07c.81 0 1.474.664 1.467 1.474-.679 58.224-41.486 106.801-96.055 119.367-1.686.386-1.401 2.875.336 2.875h-.008Z"
            />
          </svg>
        ) : (
          <span className="sync-dot" aria-hidden="true" />
        )}
        <span>{message}</span>
      </div>
    </>
  );
}
