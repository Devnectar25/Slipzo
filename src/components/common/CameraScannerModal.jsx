import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  Camera,
  X,
  RefreshCw,
  Zap,
  ZapOff,
  AlertCircle,
  CheckCircle2,
  Keyboard,
  Barcode as BarcodeIcon,
  Volume2
} from "lucide-react";
import { playScanSuccessBeep, playScanErrorBeep } from "../../lib/audioFeedback";

export function CameraScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "Scan Item Barcode"
}) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [lastScannedText, setLastScannedText] = useState(null);
  const [continuousMode, setContinuousMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const scannerRef = useRef(null);
  const qrRegionId = "slipzo-qr-reader-region";
  const lastScanTimestampRef = useRef(0);
  const lastScannedCodeRef = useRef("");

  // Initialize camera list and start default camera when opened
  useEffect(() => {
    if (!isOpen) {
      cleanupScanner();
      setCameraError(null);
      setLastScannedText(null);
      return;
    }

    let isMounted = true;

    async function initCamera() {
      try {
        setCameraError(null);
        setIsScanning(true);

        // Fetch available video devices
        let devices = [];
        try {
          devices = await Html5Qrcode.getCameras();
        } catch (e) {
          console.warn("Could not pre-fetch cameras:", e);
        }

        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCamera = devices.find((d) =>
            (d.label || "").toLowerCase().includes("back") ||
            (d.label || "").toLowerCase().includes("rear") ||
            (d.label || "").toLowerCase().includes("environment")
          );
          const activeId = backCamera ? backCamera.id : devices[0].id;
          setSelectedCameraId(activeId);
          await startScanner(activeId);
        } else {
          // Attempt direct environment camera start on mobile / tablets
          await startScanner({ facingMode: "environment" });
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Camera initialization error:", err);
        handleCameraError(err);
      }
    }

    // Delay slightly to let modal DOM render the qr-reader div
    const timer = setTimeout(() => {
      initCamera();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      cleanupScanner();
    };
  }, [isOpen]);

  const handleCameraError = (err) => {
    setIsScanning(false);
    const errStr = String(err?.message || err || "").toLowerCase();

    if (errStr.includes("notallowederror") || errStr.includes("permission denied")) {
      setCameraError({
        type: "PERMISSION_DENIED",
        message: "Camera permission was denied. Please allow camera access in your browser site settings, or use manual/USB barcode entry."
      });
    } else if (errStr.includes("notfounderror") || errStr.includes("devicesnotfound")) {
      setCameraError({
        type: "NO_CAMERA",
        message: "No camera device found on this system."
      });
    } else if (errStr.includes("notreadableerror") || errStr.includes("in use")) {
      setCameraError({
        type: "IN_USE",
        message: "Camera is currently in use by another application or tab."
      });
    } else {
      setCameraError({
        type: "UNKNOWN",
        message: err?.message || "Could not access camera. Please check your camera permissions."
      });
    }
  };

  const startScanner = async (cameraConfig) => {
    try {
      if (scannerRef.current) {
        await cleanupScanner();
      }

      const html5QrCode = new Html5Qrcode(qrRegionId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false
      });

      scannerRef.current = html5QrCode;

      const config = {
        fps: 20,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          // Generous wide scanning area to capture 1D barcodes and quiet zones completely
          const width = Math.min(viewfinderWidth * 0.94, 460);
          const height = Math.min(viewfinderHeight * 0.72, 260);
          return { width, height };
        },
        aspectRatio: 1.333333
      };

      const cameraSelection = typeof cameraConfig === "string"
        ? cameraConfig
        : (cameraConfig || { facingMode: "environment" });

      try {
        await html5QrCode.start(
          cameraSelection,
          config,
          (decodedText, decodedResult) => {
            handleDecodedBarcode(decodedText, decodedResult);
          },
          () => {}
        );
      } catch (firstErr) {
        console.warn("Primary camera start failed, retrying environment fallback...", firstErr);
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText, decodedResult) => {
            handleDecodedBarcode(decodedText, decodedResult);
          },
          () => {}
        );
      }

      setIsScanning(true);
      setCameraError(null);

      // Check for torch/flash capability
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      } catch (e) {
        setHasTorch(false);
      }
    } catch (err) {
      console.error("Scanner start error:", err);
      handleCameraError(err);
    }
  };

  const cleanupScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        // Ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setTorchOn(false);
    setHasTorch(false);
  };

  const handleDecodedBarcode = async (barcode, decodedResult) => {
    if (!barcode || isProcessing) return;
    const clean = String(barcode).trim();
    if (!clean) return;

    // Phase 10 Validation: Prevent false / partial scans
    // Slipzo barcodes follow the format SLP-XXXXXX (or unpadded SLP\d+ / SLP-\d+)
    // If a camera frame produces a noisy or partial match like "S887" / "S88", ignore and continue scanning
    if (/^s/i.test(clean) && !/^SLP-\d+$/i.test(clean) && !/^SLP\d+$/i.test(clean)) {
      return;
    }

    const detectedFormat = decodedResult?.result?.formatName || "CODE_128";
    if (import.meta.env?.DEV) {
      console.log("[CameraScannerModal] RAW DECODED TEXT:", clean);
      console.log("[CameraScannerModal] DETECTED FORMAT:", detectedFormat);
      console.log("[CameraScannerModal] NORMALIZED VALUE:", clean);
    }

    const now = Date.now();

    // Prevent runaway repeated scans of the exact same code within 1.5s
    if (clean === lastScannedCodeRef.current && now - lastScanTimestampRef.current < 1500) {
      return;
    }

    lastScanTimestampRef.current = now;
    lastScannedCodeRef.current = clean;
    setLastScannedText(clean);

    setIsProcessing(true);
    try {
      let isSuccess = false;
      if (onScan) {
        const result = await onScan(clean);
        isSuccess = result !== false;
      }

      if (isSuccess && !continuousMode) {
        await handleClose();
      }
    } catch (err) {
      console.error("Barcode scan processing error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextState = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn("Torch toggle failed:", e);
    }
  };

  const handleSwitchCamera = async (e) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    await startScanner(newId);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualInput.trim() || isProcessing) return;
    const code = manualInput.trim();
    setManualInput("");
    await handleDecodedBarcode(code);
  };

  const handleClose = async () => {
    await cleanupScanner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "18px",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "scaleIn 0.2s ease-out"
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1rem 1.25rem",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                background: "rgba(59, 130, 246, 0.2)",
                padding: "0.45rem",
                borderRadius: "10px",
                color: "#60a5fa"
              }}
            >
              <Camera size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "700" }}>{title}</h3>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>
                Position barcode inside the target box
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#cbd5e1",
              cursor: "pointer",
              borderRadius: "8px",
              padding: "0.35rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scanner Viewport Area */}
        <div
          style={{
            position: "relative",
            background: "#000000",
            minHeight: "260px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {/* HTML5 QR Code Container */}
          <div
            id={qrRegionId}
            style={{
              width: "100%",
              height: "100%",
              overflow: "hidden"
            }}
          />

          {/* Viewfinder Target Graphic Overlay (if scanning and no error) */}
          {isScanning && !cameraError && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {/* Center scan area box */}
              <div
                style={{
                  width: "75%",
                  height: "55%",
                  border: "2px solid rgba(59, 130, 246, 0.8)",
                  borderRadius: "12px",
                  position: "relative",
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)"
                }}
              >
                {/* Laser scan line animation */}
                <div
                  style={{
                    position: "absolute",
                    left: "5%",
                    right: "5%",
                    height: "2px",
                    background: "linear-gradient(90deg, transparent, #ef4444, #f87171, transparent)",
                    boxShadow: "0 0 8px #ef4444",
                    animation: "scanLaser 2s infinite ease-in-out"
                  }}
                />
              </div>
            </div>
          )}

          {/* Camera Error Message Screen */}
          {cameraError && (
            <div
              style={{
                padding: "2rem 1.5rem",
                textAlign: "center",
                color: "#ffffff",
                background: "#0f172a",
                width: "100%"
              }}
            >
              <AlertCircle size={36} style={{ color: "#ef4444", margin: "0 auto 0.75rem" }} />
              <div style={{ fontWeight: "700", fontSize: "0.95rem", marginBottom: "0.35rem" }}>
                Camera Not Available
              </div>
              <p style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.4, margin: "0 0 1rem" }}>
                {cameraError.message}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (selectedCameraId) startScanner(selectedCameraId);
                }}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}
              >
                <RefreshCw size={14} /> Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Recent Scan Success Badge */}
        {lastScannedText && (
          <div
            style={{
              padding: "0.5rem 1rem",
              background: "#ecfdf5",
              borderBottom: "1px solid #a7f3d0",
              color: "#065f46",
              fontSize: "0.82rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <CheckCircle2 size={16} style={{ color: "#10b981" }} />
              <span>Scanned: <strong>{lastScannedText}</strong></span>
            </div>
            <span style={{ fontSize: "0.72rem", color: "#059669" }}>Added to bill</span>
          </div>
        )}

        {/* Camera Controls Row */}
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem"
          }}
        >
          {/* Camera switcher */}
          {cameras.length > 1 ? (
            <select
              value={selectedCameraId || ""}
              onChange={handleSwitchCamera}
              style={{
                padding: "0.35rem 0.6rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.78rem",
                background: "#ffffff",
                color: "#334155"
              }}
            >
              {cameras.map((c, i) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <BarcodeIcon size={14} /> Ready for Code 128 / EAN / UPC
            </div>
          )}

          {/* Torch toggle */}
          {hasTorch && (
            <button
              type="button"
              onClick={handleToggleTorch}
              style={{
                background: torchOn ? "#fef3c7" : "#ffffff",
                color: torchOn ? "#b45309" : "#475569",
                border: `1px solid ${torchOn ? "#fcd34d" : "#cbd5e1"}`,
                borderRadius: "6px",
                padding: "0.35rem 0.6rem",
                fontSize: "0.75rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                cursor: "pointer"
              }}
            >
              {torchOn ? <ZapOff size={14} /> : <Zap size={14} />}
              {torchOn ? "Torch Off" : "Torch On"}
            </button>
          )}

          {/* Continuous Scan Checkbox */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "#475569", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={continuousMode}
              onChange={(e) => setContinuousMode(e.target.checked)}
              style={{ accentColor: "#2563eb", cursor: "pointer" }}
            />
            Continuous Scan
          </label>
        </div>

        {/* Manual Fallback Barcode Entry Form */}
        <form
          onSubmit={handleManualSubmit}
          style={{
            padding: "0.85rem 1rem",
            background: "#ffffff",
            display: "flex",
            gap: "0.5rem",
            alignItems: "center"
          }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <Keyboard size={15} style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Or type barcode (e.g. SLP-000001)..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              data-barcode-input="true"
              style={{
                width: "100%",
                padding: "0.45rem 0.6rem 0.45rem 2rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.82rem",
                outline: "none"
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!manualInput.trim()}
            style={{
              background: manualInput.trim() ? "#2563eb" : "#e2e8f0",
              color: manualInput.trim() ? "#ffffff" : "#94a3b8",
              border: "none",
              borderRadius: "8px",
              padding: "0.45rem 0.85rem",
              fontSize: "0.82rem",
              fontWeight: "600",
              cursor: manualInput.trim() ? "pointer" : "default"
            }}
          >
            Add
          </button>
        </form>
      </div>

      {/* Embedded style for laser scan animation */}
      <style>{`
        @keyframes scanLaser {
          0% { top: 10%; opacity: 0.8; }
          50% { top: 90%; opacity: 1; }
          100% { top: 10%; opacity: 0.8; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
