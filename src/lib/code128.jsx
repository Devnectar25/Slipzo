/**
 * Slipzo Code 128 Barcode Generator (Pure React & SVG - Zero Dependencies)
 * Implements ISO/IEC 15417 Standard for Code 128 (Subset B)
 */

export const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (104=Start B, 106=Stop)
]

/**
 * Encode raw text string into Code 128B symbols and bar/space pattern
 */
export function encodeCode128(text) {
  const clean = String(text || "").trim()
  if (!clean) return null

  const START_B = 104
  const STOP = 106

  let sum = START_B
  const values = [START_B]

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i)
    if (code < 32 || code > 127) {
      values.push(0)
    } else {
      const val = code - 32
      values.push(val)
      sum += val * (i + 1)
    }
  }

  const checksum = sum % 103
  values.push(checksum)
  values.push(STOP)

  let patternStr = ""
  for (const v of values) {
    patternStr += CODE128_PATTERNS[v]
  }

  const quietZoneModules = 14
  let currentModuleX = quietZoneModules
  const bars = []

  for (let i = 0; i < patternStr.length; i++) {
    const width = parseInt(patternStr[i], 10)
    const isBar = i % 2 === 0

    if (isBar) {
      bars.push({ x: currentModuleX, width })
    }
    currentModuleX += width
  }

  const totalModules = currentModuleX + quietZoneModules

  return {
    text: clean,
    totalModules,
    bars
  }
}

/**
 * React Component to render high-contrast SVG barcode
 */
export function Code128Barcode({
  value,
  height = 75,
  barWidth = 2.5,
  showText = true,
  className = "",
  style = {}
}) {
  const encoded = encodeCode128(value)

  if (!encoded) {
    return (
      <div style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "center", padding: "1rem" }}>
        Invalid Barcode
      </div>
    )
  }

  const svgWidth = Math.round(encoded.totalModules * barWidth)
  const textHeight = showText ? 24 : 0
  const svgHeight = height + textHeight

  return (
    <div
      className={`slipzo-barcode-container ${className}`}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        background: "#ffffff",
        padding: "10px 16px",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
        ...style
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width={svgWidth}
        height={svgHeight}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        style={{
          display: "block",
          maxWidth: "100%",
          height: "auto",
          shapeRendering: "crispEdges",
          imageRendering: "pixelated"
        }}
      >
        <rect width="100%" height="100%" fill="#ffffff" shapeRendering="crispEdges" />
        {encoded.bars.map((bar, idx) => {
          const barX = Math.round(bar.x * barWidth)
          const barW = Math.round(bar.width * barWidth)
          return (
            <rect
              key={idx}
              x={barX}
              y={0}
              width={barW}
              height={height}
              fill="#000000"
              shapeRendering="crispEdges"
            />
          )
        })}
        {showText && (
          <text
            x={svgWidth / 2}
            y={height + 18}
            textAnchor="middle"
            fill="#000000"
            fontSize="14"
            fontFamily="monospace, 'Courier New', Courier, sans-serif"
            fontWeight="700"
            letterSpacing="2.5"
          >
            {encoded.text}
          </text>
        )}
      </svg>
    </div>
  )
}
