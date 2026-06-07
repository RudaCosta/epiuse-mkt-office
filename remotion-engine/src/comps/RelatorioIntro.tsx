import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { BRAND, FONTS, EASE_PREMIUM } from "../lib/brand";

// 8s · 16:9 · intro pro /relatorio
export const RelatorioIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 3 fases:
  // 0-2s: logo + título
  // 2-5s: stats principais aparecem
  // 5-8s: CTA "veja o relatório completo abaixo"

  const op1 = interpolate(frame, [0, 20, 50, 70], [0, 1, 1, 0], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
  const op2 = interpolate(frame, [70, 90, 140, 160], [0, 1, 1, 0], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
  const op3 = interpolate(frame, [160, 180, 220, 240], [0, 1, 1, 0], { extrapolateRight: "clamp", easing: EASE_PREMIUM });

  return (
    <AbsoluteFill style={{ background: BRAND.heroGrad, fontFamily: FONTS.sans, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
      {/* Fase 1: Título */}
      {op1 > 0 && (
        <div style={{ position: "absolute", textAlign: "center", opacity: op1 }}>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "0.2em", color: BRAND.red, marginBottom: 24 }}>📊 RELATÓRIO MENSAL</div>
          <div style={{ fontSize: 130, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>EPI-USE</div>
          <div style={{ fontSize: 60, fontWeight: 700, color: BRAND.blueLight, marginTop: 12, letterSpacing: "0.05em" }}>Marketing & RevOps</div>
        </div>
      )}

      {/* Fase 2: 3 stats em row */}
      {op2 > 0 && (
        <div style={{ position: "absolute", opacity: op2, display: "flex", gap: 60 }}>
          <StatBlock value="10.640" label="Seguidores LinkedIn" color={BRAND.blueLight} />
          <StatBlock value="39k" label="Contatos Apollo" color={BRAND.success} />
          <StatBlock value="22" label="Cases publicáveis" color={BRAND.warning} />
        </div>
      )}

      {/* Fase 3: CTA */}
      {op3 > 0 && (
        <div style={{ position: "absolute", textAlign: "center", opacity: op3 }}>
          <div style={{ fontSize: 48, color: BRAND.blueLight, marginBottom: 24 }}>↓</div>
          <div style={{ fontSize: 64, fontWeight: 800, color: "#fff", lineHeight: 1.15 }}>Veja os números do mês</div>
          <div style={{ fontSize: 32, color: BRAND.textDim, marginTop: 20 }}>scroll pra baixo</div>
        </div>
      )}

      {/* Footer fixo */}
      <div style={{ position: "absolute", bottom: 40, fontSize: 18, fontWeight: 700, color: BRAND.blueLight, letterSpacing: "0.15em" }}>
        EPI-USE BRASIL · 🐘 ERP.NGO
      </div>
    </AbsoluteFill>
  );
};

const StatBlock: React.FC<{ value: string; label: string; color: string }> = ({ value, label, color }) => (
  <div style={{ textAlign: "center", background: "rgba(0,0,0,0.3)", padding: "32px 48px", borderRadius: 16, borderTop: `4px solid ${color}` }}>
    <div style={{ fontSize: 120, fontWeight: 800, color: "#fff", fontFamily: FONTS.mono, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 22, color: BRAND.textMuted, marginTop: 12, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
  </div>
);
