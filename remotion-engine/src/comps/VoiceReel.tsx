import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Sequence } from "remotion";
import { BRAND, FONTS, EASE_PREMIUM } from "../lib/brand";

export type VoiceReelProps = {
  nome: string;
  cargo: string;
  empresa: string;
  ssi_baseline?: number;
  ssi_atual?: number;
  seguidores_atual?: number;
  posts_mes?: number;
  pilares: string[]; // 3 pilares (skills)
  call_to_action: string;
};

export const voiceReelDefault: VoiceReelProps = {
  nome: "Anderson Costa",
  cargo: "Delivery Strategic Account",
  empresa: "EPI-USE Brasil",
  ssi_baseline: 34,
  ssi_atual: 58,
  seguidores_atual: 2148,
  posts_mes: 8,
  pilares: ["SAP HCM", "SuccessFactors", "Gestão de Conta"],
  call_to_action: "Conecte comigo no LinkedIn",
};

// Reel 30s · 9:16 (1080x1920) · LinkedIn / TikTok / Reels
export const VoiceReel: React.FC<VoiceReelProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: BRAND.heroGrad, fontFamily: FONTS.sans, overflow: "hidden" }}>
      {/* Background decorativo */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at top, rgba(205,21,67,0.18) 0%, transparent 50%), radial-gradient(ellipse at bottom, rgba(134,158,195,0.15) 0%, transparent 50%)`,
        }}
      />

      {/* Sequence 1 · 0-3s: Splash EPI-USE Voices */}
      <Sequence from={0} durationInFrames={90}>
        <Splash />
      </Sequence>

      {/* Sequence 2 · 3-9s: Apresentação do Voice (nome + cargo) */}
      <Sequence from={90} durationInFrames={180}>
        <Apresentacao nome={props.nome} cargo={props.cargo} empresa={props.empresa} />
      </Sequence>

      {/* Sequence 3 · 9-18s: Stats do Voice */}
      <Sequence from={270} durationInFrames={270}>
        <Stats {...props} />
      </Sequence>

      {/* Sequence 4 · 18-26s: 3 Pilares */}
      <Sequence from={540} durationInFrames={240}>
        <Pilares pilares={props.pilares} />
      </Sequence>

      {/* Sequence 5 · 26-30s: CTA final */}
      <Sequence from={780} durationInFrames={120}>
        <CTA texto={props.call_to_action} />
      </Sequence>

      {/* Footer fixo */}
      <div style={{ position: "absolute", bottom: 80, left: 0, right: 0, textAlign: "center", fontSize: 22, fontWeight: 700, color: BRAND.blueLight, letterSpacing: "0.15em" }}>
        🎙️ EPI-USE VOICES · 🐘 ERP.NGO
      </div>
    </AbsoluteFill>
  );
};

const Splash: React.FC = () => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 20, 70, 90], [0, 1, 1, 0], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
  const scale = interpolate(frame, [0, 30], [0.8, 1], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: op }}>
      <div style={{ transform: `scale(${scale})`, textAlign: "center" }}>
        <div style={{ fontSize: 28, color: BRAND.red, letterSpacing: "0.2em", fontWeight: 800, marginBottom: 24 }}>🎙️ PROGRAMA</div>
        <div style={{ fontSize: 120, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>EPI-USE</div>
        <div style={{ fontSize: 96, fontWeight: 800, color: BRAND.red, letterSpacing: "0.05em", marginTop: 8 }}>VOICES</div>
      </div>
    </AbsoluteFill>
  );
};

const Apresentacao: React.FC<{ nome: string; cargo: string; empresa: string }> = ({ nome, cargo, empresa }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 20, 160, 180], [0, 1, 1, 0], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
  const y = interpolate(frame, [0, 30], [30, 0], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80, opacity: op, transform: `translateY(${y}px)` }}>
      <div style={{ width: 240, height: 240, borderRadius: "50%", background: BRAND.red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 100, marginBottom: 48, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        👤
      </div>
      <div style={{ fontSize: 72, fontWeight: 800, color: "#fff", textAlign: "center", lineHeight: 1.1 }}>{nome}</div>
      <div style={{ fontSize: 32, color: BRAND.blueLight, marginTop: 16, textAlign: "center" }}>{cargo}</div>
      <div style={{ fontSize: 26, color: BRAND.greyDark, marginTop: 8 }}>{empresa}</div>
    </AbsoluteFill>
  );
};

const Stats: React.FC<VoiceReelProps> = ({ ssi_baseline, ssi_atual, seguidores_atual, posts_mes }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 20, 250, 270], [0, 1, 1, 0], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
  // counter animados
  const ssiAtualCount = Math.round(interpolate(frame, [20, 100], [0, ssi_atual || 0], { extrapolateRight: "clamp", easing: EASE_PREMIUM }));
  const followCount = Math.round(interpolate(frame, [60, 140], [0, seguidores_atual || 0], { extrapolateRight: "clamp", easing: EASE_PREMIUM }));
  const postsCount = Math.round(interpolate(frame, [100, 180], [0, posts_mes || 0], { extrapolateRight: "clamp", easing: EASE_PREMIUM }));
  return (
    <AbsoluteFill style={{ padding: 80, opacity: op, justifyContent: "center" }}>
      <div style={{ fontSize: 36, color: BRAND.blueLight, marginBottom: 48, fontWeight: 700, letterSpacing: "0.1em", textAlign: "center" }}>RESULTADOS</div>
      <StatRow label="SSI LinkedIn" value={ssiAtualCount} sub={`baseline: ${ssi_baseline || "—"} · evolução: +${(ssi_atual || 0) - (ssi_baseline || 0)} pts`} color={BRAND.success} />
      <StatRow label="Seguidores" value={followCount.toLocaleString("pt-BR")} sub="conexões qualificadas" color={BRAND.blueLight} />
      <StatRow label="Posts no mês" value={postsCount} sub="conteúdo autoral consistente" color={BRAND.warning} />
    </AbsoluteFill>
  );
};

const StatRow: React.FC<{ label: string; value: any; sub: string; color: string }> = ({ label, value, sub, color }) => (
  <div style={{ background: "rgba(0,0,0,0.3)", borderLeft: `6px solid ${color}`, borderRadius: 12, padding: "24px 32px", marginBottom: 24 }}>
    <div style={{ fontSize: 22, color: BRAND.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: 90, fontWeight: 800, color: "#fff", fontFamily: FONTS.mono, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 22, color: BRAND.textDim, marginTop: 8 }}>{sub}</div>
  </div>
);

const Pilares: React.FC<{ pilares: string[] }> = ({ pilares }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 20, 220, 240], [0, 1, 1, 0], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
  return (
    <AbsoluteFill style={{ padding: 80, opacity: op, justifyContent: "center" }}>
      <div style={{ fontSize: 36, color: BRAND.blueLight, marginBottom: 60, fontWeight: 700, letterSpacing: "0.1em", textAlign: "center" }}>ESPECIALIDADES</div>
      {pilares.map((p, i) => {
        const itemOp = interpolate(frame, [20 + i * 30, 50 + i * 30], [0, 1], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
        const itemX = interpolate(frame, [20 + i * 30, 50 + i * 30], [-40, 0], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
        return (
          <div key={i} style={{ background: BRAND.red, color: "#fff", padding: "32px 40px", borderRadius: 14, marginBottom: 24, opacity: itemOp, transform: `translateX(${itemX}px)`, fontSize: 56, fontWeight: 800, letterSpacing: "-0.01em" }}>
            {i + 1}. {p}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const CTA: React.FC<{ texto: string }> = ({ texto }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
  const scale = interpolate(frame, [0, 30], [0.9, 1], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80, opacity: op }}>
      <div style={{ transform: `scale(${scale})`, textAlign: "center" }}>
        <div style={{ fontSize: 48, color: BRAND.blueLight, marginBottom: 32, letterSpacing: "0.05em" }}>👇</div>
        <div style={{ fontSize: 68, fontWeight: 800, color: "#fff", lineHeight: 1.15, marginBottom: 40 }}>{texto}</div>
        <div style={{ background: BRAND.red, color: "#fff", padding: "28px 56px", borderRadius: 99, fontSize: 36, fontWeight: 800, letterSpacing: "0.05em", display: "inline-block" }}>
          🔗 LinkedIn →
        </div>
      </div>
    </AbsoluteFill>
  );
};
