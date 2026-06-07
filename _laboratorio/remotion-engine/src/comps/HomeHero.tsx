import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { BRAND, FONTS, EASE_PREMIUM } from "../lib/brand";

// Hero animado pro banner topo da HOME · loop perfeito 12s · 1920x400
export const HomeHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  // 3 "frases" rotativas no destaque
  const FRASES = [
    "Bom dia, time MKT 👋",
    "Voices em ação · 2/5 ativos 🎙️",
    "Apollo · 39k contatos · 14k empresas 📞",
  ];
  // cada frase fica 4s (120 frames)
  const seg = Math.floor(frame / 120) % 3;
  const segFrame = frame % 120;
  const fraseOp = interpolate(segFrame, [0, 15, 105, 120], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
    easing: EASE_PREMIUM,
  });
  const fraseY = interpolate(segFrame, [0, 20], [12, 0], { extrapolateRight: "clamp", easing: EASE_PREMIUM });

  // Pulsar do chip "Online"
  const pulse = Math.sin((frame / 30) * Math.PI * 2) * 0.5 + 0.5;

  // Partículas flutuantes (5 elementos)
  const partics = Array.from({ length: 5 }, (_, i) => {
    const yBase = 80 + i * 60;
    const yShift = Math.sin((frame + i * 30) / 50) * 18;
    const opacity = 0.08 + Math.sin((frame + i * 40) / 60) * 0.06;
    return { i, x: 120 + i * 360, y: yBase + yShift, opacity };
  });

  return (
    <AbsoluteFill style={{ background: BRAND.heroGrad, fontFamily: FONTS.sans, overflow: "hidden" }}>
      {/* Partículas decorativas */}
      {partics.map((p) => (
        <div
          key={p.i}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${BRAND.red} 0%, transparent 70%)`,
            opacity: p.opacity,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Conteúdo central */}
      <div style={{ position: "absolute", inset: 0, padding: "48px 64px", display: "flex", flexDirection: "column", justifyContent: "center", zIndex: 2 }}>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.18em", color: BRAND.blueLight, textTransform: "uppercase", marginBottom: 14 }}>
          EPI-USE Office · Command Center
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#fff",
            opacity: fraseOp,
            transform: `translateY(${fraseY}px)`,
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          {FRASES[seg]}
        </div>
      </div>

      {/* Chip Online (canto direito) */}
      <div
        style={{
          position: "absolute",
          top: 32,
          right: 48,
          padding: "10px 18px",
          background: `rgba(16,185,129,${0.18 + pulse * 0.12})`,
          border: `1px solid rgba(16,185,129,${0.4 + pulse * 0.3})`,
          borderRadius: 99,
          fontSize: 13,
          fontWeight: 700,
          color: "#6ee7b7",
          display: "flex",
          alignItems: "center",
          gap: 10,
          zIndex: 3,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: `0 0 ${4 + pulse * 6}px #10b981` }} />
        Escritório Online
      </div>

      {/* Strip de versão (canto inferior) */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: 64,
          fontSize: 11,
          fontFamily: FONTS.mono,
          color: BRAND.blueLight,
          letterSpacing: "0.1em",
          opacity: 0.7,
          zIndex: 3,
        }}
      >
        v0.19.0 · powered by Remotion · {durationInFrames / 30}s loop
      </div>
    </AbsoluteFill>
  );
};
