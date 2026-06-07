import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Sequence } from "remotion";
import { BRAND, FONTS, EASE_PREMIUM } from "../lib/brand";

// 15s loop · 1:1 · pro Painel da Duda · resumo do dia em vídeo curto
export const DailyDigest: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BRAND.heroGrad, fontFamily: FONTS.sans, overflow: "hidden" }}>
      <Sequence from={0} durationInFrames={75}>
        <SlideSaudacao />
      </Sequence>
      <Sequence from={75} durationInFrames={120}>
        <SlideVoices />
      </Sequence>
      <Sequence from={195} durationInFrames={120}>
        <SlideEventos />
      </Sequence>
      <Sequence from={315} durationInFrames={135}>
        <SlideAlertas />
      </Sequence>
    </AbsoluteFill>
  );
};

const SlideSaudacao: React.FC = () => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 15, 60, 75], [0, 1, 1, 0], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
  const scale = interpolate(frame, [0, 30], [0.92, 1], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: op }}>
      <div style={{ textAlign: "center", transform: `scale(${scale})` }}>
        <div style={{ fontSize: 110, marginBottom: 24 }}>🌅</div>
        <div style={{ fontSize: 70, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>Bom dia, Duda!</div>
        <div style={{ fontSize: 32, color: BRAND.blueLight, marginTop: 16, letterSpacing: "0.05em" }}>resumo do dia · EPI-USE Office</div>
      </div>
    </AbsoluteFill>
  );
};

const SlideVoices: React.FC = () => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 15, 105, 120], [0, 1, 1, 0], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
  return (
    <AbsoluteFill style={{ padding: 80, opacity: op, justifyContent: "center", alignItems: "center" }}>
      <Slide titulo="🎙️ VOICES" valor="2 / 5" sub="MVP em construção · Anderson + Furigo" color={BRAND.success} />
    </AbsoluteFill>
  );
};

const SlideEventos: React.FC = () => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 15, 105, 120], [0, 1, 1, 0], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
  return (
    <AbsoluteFill style={{ padding: 80, opacity: op, justifyContent: "center", alignItems: "center" }}>
      <Slide titulo="📅 EVENTOS PRÓXIMOS" valor="3" sub="esta semana · BR + LATAM" color={BRAND.warning} />
    </AbsoluteFill>
  );
};

const SlideAlertas: React.FC = () => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 15, 115, 135], [0, 1, 1, 0], { extrapolateRight: "clamp", easing: EASE_PREMIUM });
  return (
    <AbsoluteFill style={{ padding: 80, opacity: op, justifyContent: "center", alignItems: "center" }}>
      <Slide titulo="🔴 ALERTAS" valor="3 ativos" sub="pendências bloqueadas · ver painel" color={BRAND.danger} />
    </AbsoluteFill>
  );
};

const Slide: React.FC<{ titulo: string; valor: string; sub: string; color: string }> = ({ titulo, valor, sub, color }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "0.15em", color: BRAND.blueLight, marginBottom: 32 }}>{titulo}</div>
    <div style={{ fontSize: 220, fontWeight: 800, color, lineHeight: 1, fontFamily: FONTS.mono, textShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>{valor}</div>
    <div style={{ fontSize: 32, color: BRAND.textDim, marginTop: 32, maxWidth: 800 }}>{sub}</div>
  </div>
);
