import React from "react"

export function Skeleton({ className = "", width, height, borderRadius, style = {} }) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width: width || "100%",
        height: height || "1rem",
        borderRadius: borderRadius || "8px",
        ...style
      }}
    />
  )
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-card-header">
            <Skeleton width="40px" height="40px" borderRadius="10px" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              <Skeleton width="60%" height="18px" />
              <Skeleton width="40%" height="12px" />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "1rem" }}>
            <Skeleton width="90%" height="14px" />
            <Skeleton width="75%" height="14px" />
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "1.25rem" }}>
            <Skeleton width="80px" height="32px" borderRadius="6px" />
            <Skeleton width="32px" height="32px" borderRadius="6px" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width="70%" height="16px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="skeleton-table-row">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              width={colIndex === 0 ? "80%" : colIndex === cols - 1 ? "40%" : "60%"}
              height="14px"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function MetricSkeleton({ count = 3 }) {
  return (
    <div className="skeleton-metrics-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-metric-card">
          <Skeleton width="45%" height="13px" />
          <Skeleton width="70%" height="28px" style={{ margin: "8px 0" }} />
          <Skeleton width="60%" height="11px" />
        </div>
      ))}
    </div>
  )
}

export function ReceiptSkeleton() {
  return (
    <div className="skeleton-receipt">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", marginBottom: "1rem" }}>
        <Skeleton width="36px" height="36px" borderRadius="50%" />
        <Skeleton width="140px" height="18px" />
        <Skeleton width="100px" height="12px" />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", margin: "12px 0" }}>
        <Skeleton width="80px" height="12px" />
        <Skeleton width="80px" height="12px" />
      </div>
      <Skeleton width="100%" height="1px" style={{ margin: "10px 0" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "12px 0" }}>
        <Skeleton width="100%" height="14px" />
        <Skeleton width="100%" height="14px" />
        <Skeleton width="100%" height="14px" />
      </div>
      <Skeleton width="100%" height="1px" style={{ margin: "10px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
        <Skeleton width="70px" height="16px" />
        <Skeleton width="60px" height="16px" />
      </div>
    </div>
  )
}

export function Spinner({ size = 18, color = "currentColor" }) {
  return (
    <svg
      className="inline-spinner"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

export function ButtonLoader({ text = "Loading...", size = 16 }) {
  return (
    <span className="btn-loader-content">
      <Spinner size={size} />
      <span>{text}</span>
    </span>
  )
}
