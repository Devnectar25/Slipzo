import { useState, useEffect } from "react"
import { X, Printer, Copy, Check, Barcode as BarcodeIcon, Tag } from "lucide-react"
import { Code128Barcode } from "../../lib/code128"
import { printBarcodeLabel, LABEL_FORMATS } from "../../lib/printBarcodeLabel"
import { useToast } from "./Toast"

export function BarcodeModal({ item, isOpen, onClose, shopName = "SLIPZO POS" }) {
  const [labelSize, setLabelSize] = useState("50x25mm")
  const [copies, setCopies] = useState(1)
  const [copied, setCopied] = useState(false)
  const { success: toastSuccess } = useToast()

  useEffect(() => {
    if (isOpen && item) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen, item])

  if (!isOpen || !item) return null

  const barcodeValue = item.barcode || "SLP-000001"
  const itemName = item.name || "Menu Item"

  const handleCopyBarcode = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(barcodeValue)
      setCopied(true)
      toastSuccess(`Copied "${barcodeValue}" to clipboard`)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handlePrint = () => {
    printBarcodeLabel(item, {
      labelSize,
      shopName,
      copies: parseInt(copies, 10) || 1
    })
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "440px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          animation: "modalFadeIn 0.2s ease-out"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.1rem 1.25rem",
            borderBottom: "1px solid #f1f5f9",
            background: "#f8fafc"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#e0f2fe",
                color: "#0284c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <BarcodeIcon size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                Item Barcode Label
              </h3>
              <p style={{ fontSize: "0.78rem", color: "#64748b", margin: 0 }}>
                Standard Code 128 machine-readable identifier
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "6px",
              color: "#64748b",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.25rem" }}>
          {/* Label Card Preview */}
          <div
            style={{
              background: "#ffffff",
              border: "2px solid #0f172a",
              borderRadius: "10px",
              padding: "1rem",
              textAlign: "center",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
              marginBottom: "1.25rem",
              position: "relative"
            }}
          >
            <div
              style={{
                fontSize: "0.68rem",
                fontWeight: "800",
                letterSpacing: "1px",
                color: "#64748b",
                textTransform: "uppercase",
                marginBottom: "0.25rem"
              }}
            >
              {shopName}
            </div>

            <div
              style={{
                fontSize: "1.05rem",
                fontWeight: "800",
                color: "#0f172a",
                marginBottom: "0.5rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {itemName}
            </div>

            {/* Render Code 128 Barcode */}
            <div style={{ display: "flex", justifyContent: "center", margin: "0.5rem 0" }}>
              <Code128Barcode value={barcodeValue} height={85} barWidth={3} showText={true} />
            </div>
          </div>

          {/* Quick Barcode Value & Copy Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#f8fafc",
              padding: "0.6rem 0.85rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              marginBottom: "1.25rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Tag size={15} style={{ color: "#0284c7" }} />
              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Code:</span>
              <strong style={{ fontFamily: "monospace", fontSize: "0.92rem", color: "#0f172a" }}>
                {barcodeValue}
              </strong>
            </div>

            <button
              type="button"
              onClick={handleCopyBarcode}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.78rem",
                fontWeight: "600",
                padding: "0.3rem 0.65rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: copied ? "#f0fdf4" : "#ffffff",
                color: copied ? "#16a34a" : "#334155",
                cursor: "pointer"
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* Label Print Size & Copies Config */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#475569", marginBottom: "0.3rem" }}>
                Label Format
              </label>
              <select
                value={labelSize}
                onChange={(e) => setLabelSize(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: "500"
                }}
              >
                {Object.values(LABEL_FORMATS).map((fmt) => (
                  <option key={fmt.id} value={fmt.id}>
                    {fmt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#475569", marginBottom: "0.3rem" }}>
                Copies
              </label>
              <select
                value={copies}
                onChange={(e) => setCopies(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: "500"
                }}
              >
                <option value={1}>1 Copy</option>
                <option value={2}>2 Copies</option>
                <option value={5}>5 Copies</option>
                <option value={10}>10 Copies (Single A4 Page)</option>
                <option value={15}>15 Copies (Single A4 Page)</option>
                <option value={20}>20 Copies (Single A4 Page)</option>
                <option value={24}>24 Copies (Full A4 Sheet)</option>
                <option value={30}>30 Copies (Full A4 Sheet)</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                color: "#ffffff",
                fontSize: "0.92rem",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)"
              }}
            >
              <Printer size={18} /> Print Barcode Label
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                color: "#475569",
                fontSize: "0.9rem",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
