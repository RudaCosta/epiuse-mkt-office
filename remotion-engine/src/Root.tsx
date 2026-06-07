import { Composition } from "remotion";
import { HomeHero } from "./comps/HomeHero";
import { VoiceReel, voiceReelDefault } from "./comps/VoiceReel";
import { AniversarioCard, aniversarioDefault } from "./comps/AniversarioCard";
import { DailyDigest } from "./comps/DailyDigest";
import { RelatorioIntro } from "./comps/RelatorioIntro";

export const Root: React.FC = () => {
  return (
    <>
      {/* HOME HERO · loop 12s · embed em /, banner topo */}
      <Composition
        id="HomeHero"
        component={HomeHero}
        durationInFrames={360}
        fps={30}
        width={1920}
        height={400}
      />

      {/* VOICE REEL · 30s 9:16 · LinkedIn pro Voice */}
      <Composition
        id="VoiceReel"
        component={VoiceReel}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={voiceReelDefault}
      />

      {/* ANIVERSÁRIO CARD · 6s 1:1 · social */}
      <Composition
        id="AniversarioCard"
        component={AniversarioCard}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={aniversarioDefault}
      />

      {/* DAILY DIGEST · 15s 1:1 · loop pro painel da Duda */}
      <Composition
        id="DailyDigest"
        component={DailyDigest}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1080}
      />

      {/* RELATÓRIO INTRO · 8s 16:9 · intro do /relatorio */}
      <Composition
        id="RelatorioIntro"
        component={RelatorioIntro}
        durationInFrames={240}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
