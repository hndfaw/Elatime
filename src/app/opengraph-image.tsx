import { ImageResponse } from "next/og";

export const alt = "Elatime — kid-friendly events, mapped";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Branded social/link-preview card, generated at build time. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #fff6ec 0%, #ffe9d6 45%, #e8f6fd 100%)",
          color: "#2c2a3a",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 24,
              background: "#ffd166",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 52,
            }}
          >
            🧸
          </div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 800 }}>
            <span style={{ color: "#ff6b6b" }}>Ela</span>
            <span>time</span>
          </div>
        </div>
        <div style={{ marginTop: 28, fontSize: 42, fontWeight: 700, maxWidth: 900 }}>
          Kid-friendly & toddler activities, mapped. 🎈
        </div>
        <div style={{ marginTop: 16, fontSize: 28, color: "#6f6d7e", maxWidth: 900 }}>
          Real events from municipal sites, community boards & venues across Lee
          County, FL — on a custom interactive map.
        </div>
      </div>
    ),
    { ...size }
  );
}
