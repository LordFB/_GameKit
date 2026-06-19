"use client";

/* eslint-disable @next/next/no-img-element */
/* Every <img> here renders a base64 data URL (a captured screenshot / pixel
   diff). next/image can't optimize data URLs and needs known dimensions, so a
   plain <img> is correct for this dev-only overlay. */

import { useCallback } from "react";
import { TddIcon } from "./icons";
import type { TddIconName } from "./icons";
import { useEscape, useFocusTrap } from "./hooks";
import type { VisualDiffResult } from "./visualDiff";
import type { ScreenshotAttachment } from "./testRunner";

export interface ScreenshotGallery {
  title: string;
  screenshots: ScreenshotAttachment[];
  index: number;
}

export function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
  variant,
}: {
  icon: TddIconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "danger";
}) {
  return (
    <button
      type="button"
      className="tdd-button"
      data-variant={variant}
      onClick={onClick}
      disabled={disabled}
    >
      <TddIcon name={icon} size={13} /> {label}
    </button>
  );
}

export function SidebarAction({
  icon,
  label,
  onClick,
  disabled,
  variant,
}: {
  icon: TddIconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "danger";
}) {
  return (
    <button
      type="button"
      className="tdd-button"
      data-variant={variant}
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{ height: 32, padding: "0 6px", fontSize: 11 }}
    >
      <TddIcon name={icon} size={13} />
    </button>
  );
}

export function VisualShot({ title, url, src }: { title: string; url: string; src: string }) {
  return (
    <figure className="tdd-visual-shot">
      <div className="tdd-visual-shot-header">
        <strong>{title}</strong>
        <span>{url}</span>
      </div>
      <img src={src} alt={`${title} screenshot`} />
    </figure>
  );
}

export function VisualCompareModal({
  result,
  slider,
  onSlider,
  onClose,
  onCopyDiff,
  copyLabel,
}: {
  result: VisualDiffResult;
  slider: number;
  onSlider: (value: number) => void;
  onClose: () => void;
  onCopyDiff: () => void;
  copyLabel: { icon: TddIconName; text: string };
}) {
  useEscape(true, onClose);
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  return (
    <div className="tdd-compare-backdrop" role="dialog" aria-modal="true" aria-label="Visual screenshot comparison">
      <div className="tdd-compare-modal" ref={trapRef}>
        <div className="tdd-compare-header">
          <div>
            <h2>Visual comparison</h2>
            <p>
              {(result.mismatchRatio * 100).toFixed(2)}% changed ·{" "}
              {result.mismatchPixels.toLocaleString()} pixels
            </p>
          </div>
          <button
            type="button"
            className="tdd-icon-button"
            onClick={onClose}
            aria-label="Close visual comparison"
          >
            <TddIcon name="close" />
          </button>
        </div>

        <div className="tdd-compare-frame">
          <img className="tdd-compare-image" src={result.targetPng} alt="Local screenshot" />
          <img
            className="tdd-compare-image tdd-compare-image-top"
            src={result.referencePng}
            alt="Reference screenshot"
            style={{ clipPath: `inset(0 ${100 - slider}% 0 0)` }}
          />
          <div className="tdd-compare-divider" style={{ left: `${slider}%` }}>
            <span />
          </div>
          <span className="tdd-compare-label" data-side="left">
            Reference
          </span>
          <span className="tdd-compare-label" data-side="right">
            Local
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={slider}
            onChange={(e) => onSlider(Number(e.target.value))}
            className="tdd-compare-range"
            aria-label="Image comparison slider"
          />
        </div>

        <div className="tdd-compare-footer">
          <div>
            <strong>Local</strong>
            <span>{result.targetUrl}</span>
          </div>
          <div>
            <strong>Reference</strong>
            <span>{result.referenceUrl}</span>
          </div>
          <button type="button" className="tdd-button" onClick={onCopyDiff}>
            <TddIcon name={copyLabel.icon} size={13} />
            {copyLabel.text}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ScreenshotGalleryModal({
  gallery,
  onClose,
  onIndexChange,
}: {
  gallery: ScreenshotGallery;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const active = gallery.screenshots[gallery.index];
  const lastIndex = gallery.screenshots.length - 1;
  const move = useCallback(
    (delta: number) => {
      onIndexChange(Math.min(lastIndex, Math.max(0, gallery.index + delta)));
    },
    [gallery.index, lastIndex, onIndexChange]
  );

  useEscape(true, onClose);
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  return (
    <div
      className="tdd-shot-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Test screenshot gallery"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") move(-1);
        if (e.key === "ArrowRight") move(1);
      }}
    >
      <div className="tdd-shot-modal" ref={trapRef}>
        <div className="tdd-shot-header">
          <div>
            <h2>{gallery.title}</h2>
            <p>
              {gallery.index + 1} of {gallery.screenshots.length} · {active.name}
            </p>
          </div>
          <button
            type="button"
            className="tdd-icon-button"
            onClick={onClose}
            aria-label="Close screenshot gallery"
          >
            <TddIcon name="close" />
          </button>
        </div>

        <div className="tdd-shot-stage">
          <div className="tdd-shot-frame">
            <img src={active.dataUrl} alt={active.name} />
          </div>
          {gallery.screenshots.length > 1 && (
            <>
              <button
                type="button"
                className="tdd-shot-nav"
                data-side="prev"
                onClick={() => move(-1)}
                disabled={gallery.index === 0}
                aria-label="Previous screenshot"
              >
                <TddIcon name="chevron-left" size={20} />
              </button>
              <button
                type="button"
                className="tdd-shot-nav"
                data-side="next"
                onClick={() => move(1)}
                disabled={gallery.index === lastIndex}
                aria-label="Next screenshot"
              >
                <TddIcon name="chevron-right" size={20} />
              </button>
            </>
          )}
        </div>

        <div className="tdd-shot-footer">
          <div>
            <strong>
              {active.width}x{active.height}
            </strong>
            {active.path && <span>{active.path}</span>}
          </div>
          <input
            type="range"
            min={0}
            max={lastIndex}
            value={gallery.index}
            onChange={(e) => onIndexChange(Number(e.target.value))}
            disabled={gallery.screenshots.length <= 1}
            aria-label="Screenshot gallery slider"
          />
        </div>
      </div>
    </div>
  );
}
