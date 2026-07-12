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
          background: "linear-gradient(135deg, #16283d 0%, #0b1220 70%)",
          color: "#e6edf3",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#ff6b6b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
            }}
          >
            🧸
          </div>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 800 }}>
            <span style={{ color: "#ff6b6b" }}>Ela</span>
            <span>time</span>
          </div>
        </div>
        <div style={{ marginTop: 28, fontSize: 40, fontWeight: 600, maxWidth: 900 }}>
          Kid-friendly & toddler activities, mapped.
        </div>
        <div style={{ marginTop: 16, fontSize: 28, color: "#9fb3c8", maxWidth: 900 }}>
          Real events from municipal sites, community boards & venues across Lee
          County, FL — on a custom interactive map.
        </div>
      </div>
    ),
    { ...size }
  );
}
