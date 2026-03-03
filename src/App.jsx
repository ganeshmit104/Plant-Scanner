import { useState, useRef, useCallback } from "react";

const ACCENT = "#4ade80";
const BG = "#0a0f0a";
const CARD = "#0f1a0f";
const BORDER = "#1a2e1a";

function ScoreBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#6b8f6b", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {label}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: color || ACCENT, fontWeight: 500 }}>
          {value}%
        </span>
      </div>
      <div style={{ height: 4, background: "#1a2e1a", borderRadius: 2, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            background: color || ACCENT,
            borderRadius: 2,
            transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: `0 0 8px ${color || ACCENT}50`,
          }}
        />
      </div>
    </div>
  );
}

function Badge({ text, type }) {
  const colors = {
    healthy: { bg: "#0f2e1a", color: "#4ade80", border: "#1a4a2a" },
    warning: { bg: "#2e2010", color: "#fb923c", border: "#4a3010" },
    danger:  { bg: "#2e0f0f", color: "#f87171", border: "#4a1a1a" },
    info:    { bg: "#0f1e2e", color: "#60a5fa", border: "#1a304a" },
  };
  const c = colors[type] || colors.info;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      {text}
    </span>
  );
}

function CareCard({ icon, label, value }) {
  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <p style={{ fontSize: 10, color: "#4a7a4a", letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 6px" }}>
        {label}
      </p>
      <p style={{ fontSize: 12, color: "#c8e6c8", margin: 0, lineHeight: 1.6, fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </p>
    </div>
  );
}

export default function App() {
  const [image, setImage] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const processFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      setImageData({ base64: e.target.result.split(",")[1], mimeType: file.type });
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      processFile(e.dataTransfer.files[0]);
    },
    [processFile]
  );

  const analyze = async () => {
    if (!imageData) return;
    setLoading(true);
    setError(null);

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      setError("Missing VITE_ANTHROPIC_API_KEY environment variable. Add it in Vercel project settings.");
      setLoading(false);
      return;
    }

    try {
      const prompt = `You are an expert botanist and soil scientist. Analyze this plant leaf image thoroughly.

Respond ONLY with a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "plantName": "Common name (Scientific name if known)",
  "overallHealth": <0-100>,
  "healthStatus": "Excellent|Good|Fair|Poor|Critical",
  "healthStatusType": "healthy|warning|danger",
  "soilHealth": <0-100>,
  "hydration": <0-100>,
  "nutrientLevel": <0-100>,
  "chlorophyll": <0-100>,
  "issues": ["issue1", "issue2"],
  "issueTypes": ["warning|danger|info"],
  "soilRecommendations": ["rec1", "rec2", "rec3"],
  "wateringSchedule": "e.g. Every 3-4 days",
  "sunlight": "e.g. Bright indirect light",
  "fertilizer": "e.g. Balanced NPK monthly",
  "diseases": ["disease name or omit if none"],
  "pests": ["pest name or omit if none"],
  "summary": "2-3 sentence expert summary of the plant's condition and care needs."
}`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: imageData.mimeType, data: imageData.base64 },
                },
                { type: "text", text: prompt },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const text = data.content?.find((b) => b.type === "text")?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
    } catch (e) {
      setError("Analysis failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setImageData(null);
    setResult(null);
    setError(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "'JetBrains Mono', monospace", color: "#c8e6c8", padding: "0 16px 60px" }}>
      {/* Header */}
      <div style={{ maxWidth: 720, margin: "0 auto", paddingTop: 52, paddingBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "#0f2e1a",
              border: `1px solid ${ACCENT}40`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            🌿
          </div>
          <span style={{ fontSize: 11, color: "#4a7a4a", letterSpacing: "0.3em", textTransform: "uppercase" }}>
            Flora.AI
          </span>
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(28px, 6vw, 48px)",
            fontWeight: 700,
            color: "#e8f5e8",
            margin: "0 0 10px",
            lineHeight: 1.1,
          }}
        >
          Plant Health
          <br />
          <em style={{ color: ACCENT, fontStyle: "italic" }}>Diagnostics</em>
        </h1>
        <p style={{ fontSize: 12, color: "#4a7a4a", letterSpacing: "0.04em", lineHeight: 1.8 }}>
          Upload a leaf photo · Get instant AI analysis · Soil · Hydration · Disease Detection
        </p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {!image ? (
          /* Upload Zone */
          <div
            className="upload-zone"
            onClick={() => fileRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? ACCENT : BORDER}`,
              borderRadius: 20,
              padding: "72px 32px",
              textAlign: "center",
              cursor: "pointer",
              background: dragOver ? "#0d1a0d" : CARD,
              transition: "all 0.2s",
            }}
          >
            <div style={{ fontSize: 52, marginBottom: 18, filter: "grayscale(0.2)" }}>🍃</div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#e8f5e8", margin: "0 0 8px" }}>
              Drop a leaf photo here
            </p>
            <p style={{ fontSize: 11, color: "#4a7a4a", letterSpacing: "0.1em" }}>
              or click to browse &nbsp;·&nbsp; JPG &nbsp;·&nbsp; PNG &nbsp;·&nbsp; WEBP
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => processFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div>
            {/* Image + Status */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 16,
                  overflow: "hidden",
                  position: "relative",
                  minHeight: 220,
                }}
              >
                <img
                  src={image}
                  alt="leaf"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 220 }}
                />
                {loading && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(10,15,10,0.75)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 14,
                    }}
                  >
                    <div style={{ width: "70%", height: 2, background: BORDER, borderRadius: 1, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: "35%",
                          background: ACCENT,
                          borderRadius: 1,
                          animation: "scan 1.6s linear infinite",
                          boxShadow: `0 0 12px ${ACCENT}`,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 10, color: ACCENT, letterSpacing: "0.25em", animation: "pulse 1.5s ease infinite" }}>
                      SCANNING LEAF...
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18, flex: 1 }}>
                  <p style={{ fontSize: 10, color: "#4a7a4a", letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 10px" }}>
                    Status
                  </p>
                  {result ? (
                    <>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: "#e8f5e8", margin: "0 0 8px", lineHeight: 1.3 }}>
                        {result.plantName}
                      </p>
                      <Badge text={result.healthStatus} type={result.healthStatusType} />
                    </>
                  ) : (
                    <p style={{ fontSize: 12, color: "#4a7a4a" }}>
                      {loading ? "Analyzing..." : "Ready to scan"}
                    </p>
                  )}
                </div>

                <button
                  className="btn-primary"
                  disabled={loading}
                  onClick={result ? reset : analyze}
                  style={{
                    padding: "14px 20px",
                    borderRadius: 10,
                    border: "none",
                    background: loading ? BORDER : result ? "#1a2e1a" : ACCENT,
                    color: loading ? "#4a7a4a" : result ? "#c8e6c8" : "#0a2a0a",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: loading ? "not-allowed" : "pointer",
                    letterSpacing: "0.1em",
                    transition: "all 0.2s",
                  }}
                >
                  {loading ? "⟳  SCANNING" : result ? "✕  NEW SCAN" : "⬡  ANALYZE LEAF"}
                </button>

                {!result && !loading && (
                  <button
                    onClick={reset}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 10,
                      border: `1px solid ${BORDER}`,
                      background: "transparent",
                      color: "#4a7a4a",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      cursor: "pointer",
                      letterSpacing: "0.1em",
                      transition: "all 0.2s",
                    }}
                  >
                    ← CHANGE IMAGE
                  </button>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  background: "#1a0a0a",
                  border: "1px solid #4a1a1a",
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 16,
                  color: "#f87171",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                ⚠ {error}
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="card-appear">

                {/* Vitals */}
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, marginBottom: 16 }}>
                  <p style={{ fontSize: 10, color: "#4a7a4a", letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 20px" }}>
                    Vitals
                  </p>
                  <ScoreBar label="Overall Health" value={result.overallHealth} />
                  <ScoreBar label="Soil Health" value={result.soilHealth} color="#a78bfa" />
                  <ScoreBar label="Hydration" value={result.hydration} color="#60a5fa" />
                  <ScoreBar label="Nutrient Level" value={result.nutrientLevel} color="#fbbf24" />
                  <ScoreBar label="Chlorophyll" value={result.chlorophyll} color="#34d399" />
                </div>

                {/* Diagnosis */}
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, marginBottom: 16 }}>
                  <p style={{ fontSize: 10, color: "#4a7a4a", letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 14px" }}>
                    Diagnosis
                  </p>
                  <p
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontStyle: "italic",
                      fontSize: 15,
                      color: "#c8e6c8",
                      lineHeight: 1.8,
                      margin: "0 0 16px",
                    }}
                  >
                    {result.summary}
                  </p>
                  <div>
                    {result.issues?.filter(Boolean).map((issue, i) => (
                      <Badge key={i} text={issue} type={result.issueTypes?.[i] || "warning"} />
                    ))}
                  </div>
                </div>

                {/* Care Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                  <CareCard icon="💧" label="Watering" value={result.wateringSchedule} />
                  <CareCard icon="☀️" label="Sunlight" value={result.sunlight} />
                  <CareCard icon="🌱" label="Fertilizer" value={result.fertilizer} />
                </div>

                {/* Soil Recommendations */}
                {result.soilRecommendations?.length > 0 && (
                  <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, marginBottom: 16 }}>
                    <p style={{ fontSize: 10, color: "#4a7a4a", letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 16px" }}>
                      Soil Recommendations
                    </p>
                    {result.soilRecommendations.map((rec, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                        <span style={{ color: ACCENT, fontSize: 10, marginTop: 3, flexShrink: 0 }}>▸</span>
                        <span style={{ fontSize: 12, color: "#a8c8a8", lineHeight: 1.7 }}>{rec}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Threats */}
                {(result.diseases?.some(Boolean) || result.pests?.some(Boolean)) && (
                  <div
                    style={{
                      background: "#140c0c",
                      border: "1px solid #3a1a1a",
                      borderRadius: 16,
                      padding: 24,
                      marginBottom: 16,
                    }}
                  >
                    <p style={{ fontSize: 10, color: "#7a4a4a", letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 14px" }}>
                      ⚠ Threats Detected
                    </p>
                    {result.diseases?.filter(Boolean).map((d, i) => (
                      <Badge key={`d${i}`} text={`Disease: ${d}`} type="danger" />
                    ))}
                    {result.pests?.filter(Boolean).map((p, i) => (
                      <Badge key={`p${i}`} text={`Pest: ${p}`} type="warning" />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ maxWidth: 720, margin: "36px auto 0", textAlign: "center" }}>
        <p style={{ fontSize: 10, color: "#2a4a2a", letterSpacing: "0.12em", lineHeight: 1.7 }}>
          Powered by Claude Vision AI &nbsp;·&nbsp; For guidance only &nbsp;·&nbsp; Consult a botanist for critical care
        </p>
      </div>
    </div>
  );
}
