import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { BRAND, FONTS, EASE_PREMIUM } from "../lib/brand";

export type AniversarioProps = {
  nome: string;
  papel: string;
  data: string; // "DD/MM"
  emoji_extra?: string;
};

export const aniversarioDefault: AniversarioProps = {
  nome: "Eduarda Hirose",
  papel: "Brand Experience · Duda",
  data: "15/06",
  emoji_extra: "🎨",
};

// 6s · 1:1 · pra Slack/Teams/LinkedIn corporativo
export const AniversarioCard: React.FC<AniversarioProps> = ({ nome, papel, data, emoji_extra }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Confetti positions
  const confettis = Array.from({ length: 20 }, (_, i) => {
    const fallStart = 20 + (i % 5) * 8;
    const y = interpolate(frame, [fallStart, fallStart + 90], [-100, 1100], { extrapolateRight: "extend", easing: EASE_PREMIUM });
    const rotateSpeed = 6 + (i % 4);
    const colors = [BRAND.red, BRAND.warning, "#34d399", BRAND.blueLight, "#c084fc"];
    return {
      i,
      x: 80 + (i * 53) % 920,
      y,
      color: colors[i % 5],
      rotate: frame * rotateSpeed,
    };
  });

  // Spring no cake emoji
  const cakeScale = spring({ frame: frame - 30, fps, config: { damping: 8, mass: 0.6 } });
  const nomeOp = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
  const dataOp = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp", easing: EASE_PREMIUM });

  return (
    <AbsoluteFill style={{ background: BRAND.heroGrad, fontFamily: FONTS.sans, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
      {/* Confetti */}
      {confettis.map((c) => (
        <div
          key={c.i}
          style={{
            position: "absolute",
            left: c.x,
            top: c.y,
            width: 16,
            height: 16,
            background: c.color,
            transform: `rotate(${c.rotate}deg)`,
            borderRadius: 3,
            opacity: 0.85,
          }}
        />
      ))}

      {/* Card central */}
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: 60, background: "rgba(0,0,0,0.35)", borderRadius: 32, border: `2px solid rgba(255,255,255,0.15)`, backdropFilter: "blur(12px)" }}>
        <div style={{ fontSize: 200, lineHeight: 1, transform: `scale(${cakeScale})`, transformOrigin: "center" }}>🎂</div>

        <div style={{ fontSize: 28, fontWeight: 800, color: BRAND.red, letterSpacing: "0.2em", marginTop: 24 }}>
          PARABÉNS{emoji_extra ? ` ${emoji_extra}` : ""}
        </div>

        <div style={{ fontSize: 80, fontWeight: 800, color: "#fff", marginTop: 20, lineHeight: 1.1, opacity: nomeOp }}>
          {nome}
        </div>
        <div style={{ fontSize: 28, color: BRAND.blueLight, marginTop: 12, opacity: nomeOp }}>{papel}</div>

        <div style={{ marginTop: 36, padding: "20px 36px", background: BRAND.red, borderRadius: 14, display: "inline-block", fontSize: 36, fontWeight: 800, color: "#fff", fontFamily: FONTS.mono, letterSpacing: "0.1em", opacity: dataOp }}>
          🎉 {data}
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: 50, fontSize: 22, fontWeight: 700, color: BRAND.blueLight, letterSpacing: "0.15em" }}>
        TIME EPI-USE BRASIL · MARKETING & REVOPS
      </div>
    </AbsoluteFill>
  );
};
