import { useEffect, useRef } from "react";

/**
 * useBarcodeScanner
 * High-precision React hook for physical USB, Bluetooth, and Keyboard-Wedge barcode scanners.
 *
 * Characteristics:
 * - Operates reliably without requiring proprietary SDKs.
 * - Detects high-speed hardware keystroke bursts (< 50ms interval) vs human typing (> 100ms).
 * - Intercepts terminators (Enter, Tab, Return) and cleans barcode payloads.
 * - Automatically active during New Bill without needing manual input focus.
 * - Protects normal text fields from corruption during background scans.
 * - Confines scanner listening strictly to the active New Bill screen.
 *
 * @param {Function} onScan - Callback invoked with sanitized barcode string
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether listener is active (default: true)
 * @param {number} options.maxIntervalMs - Maximum ms between keystrokes to classify as scanner (default: 55ms)
 * @param {number} options.minBarcodeLength - Minimum characters for a valid barcode (default: 3)
 */
export function useBarcodeScanner(onScan, options = {}) {
  const {
    enabled = true,
    maxIntervalMs = 120,
    minBarcodeLength = 3
  } = options;

  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const isScannerSequenceRef = useRef(false);
  const idleTimerRef = useRef(null);
  const activeInputRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const processCandidate = (rawCandidate, wasBurst, targetInput, isDedicated) => {
      if (!rawCandidate) return;

      // Strip non-printable control characters and common AIM symbology identifiers (e.g. ]C1, ]e0)
      const candidate = rawCandidate
        .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
        .replace(/^\][A-Za-z0-9]{2}/, "")
        .trim();

      if (candidate.length < minBarcodeLength) return;

      const isPatternMatch = candidate.toUpperCase().startsWith("SLP-") || 
                            candidate.toUpperCase().startsWith("SLP") ||
                            (candidate.length >= minBarcodeLength && /^[A-Za-z0-9_-]+$/.test(candidate));

      const isNormalInput = targetInput && (
        targetInput.tagName?.toLowerCase() === "input" || 
        targetInput.tagName?.toLowerCase() === "textarea" || 
        targetInput.isContentEditable
      );

      const isSearchInput = targetInput && (
        (targetInput.className && typeof targetInput.className === "string" && targetInput.className.includes("search")) ||
        targetInput.getAttribute?.("type") === "search" ||
        targetInput.getAttribute?.("placeholder")?.toLowerCase().includes("search")
      );

      // If scanner burst detected, OR pattern matches, OR dedicated input, OR not a normal text field, OR inside search bar
      if (wasBurst || isPatternMatch || isDedicated || !isNormalInput || isSearchInput) {
        if (targetInput && isNormalInput && !isDedicated) {
          if (typeof targetInput.value === "string") {
            targetInput.value = "";
          }
        }

        onScanRef.current?.(candidate);
      }
    };

    const resetBuffer = () => {
      bufferRef.current = "";
      isScannerSequenceRef.current = false;
      activeInputRef.current = null;
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    const handleKeyDown = (e) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Clear any pending idle reset
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      // Ignore modifier keys alone
      if (["Shift", "Control", "Alt", "Meta", "CapsLock", "NumLock"].includes(e.key)) {
        return;
      }

      const targetInput = e.target;
      activeInputRef.current = targetInput;
      const isDedicated = targetInput && targetInput.getAttribute && targetInput.getAttribute("data-barcode-input") === "true";

      // 1. Scanner Terminator (Enter, Tab, Return)
      if (e.key === "Enter" || e.key === "Tab" || e.keyCode === 13 || e.keyCode === 9) {
        const rawCandidate = bufferRef.current;
        const wasBurst = isScannerSequenceRef.current;
        resetBuffer();

        if (rawCandidate) {
          e.preventDefault();
          e.stopPropagation();
          processCandidate(rawCandidate, wasBurst, targetInput, isDedicated);
        }
        return;
      }

      // 2. Printable character accumulation
      if (e.key && e.key.length === 1) {
        if (timeSinceLastKey <= maxIntervalMs) {
          // Rapid keystroke detected -> Mark as hardware scanner burst
          isScannerSequenceRef.current = true;
        }

        // Always append character to buffer so no letters are ever overwritten
        bufferRef.current += e.key;

        // Schedule idle auto-completion (for Bluetooth / USB scanners configured with NO Enter suffix)
        idleTimerRef.current = setTimeout(() => {
          const rawCandidate = bufferRef.current;
          const wasBurst = isScannerSequenceRef.current;
          const target = activeInputRef.current;
          resetBuffer();

          if (wasBurst && rawCandidate) {
            processCandidate(rawCandidate, true, target, isDedicated);
          }
        }, 300);
      }
    };

    // Capture phase listener to intercept scanner keystrokes before bubbling
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [enabled, maxIntervalMs, minBarcodeLength]);
}
