import { useState, type CSSProperties } from "react";

import { ITEMS } from "../../core/data";
import type { GameState, PlayerProgress } from "../../core/types";
import type { AudioSettings } from "../audio/audioDirector";
import { FAMILY_COPY, itemCopy } from "../content/gameText";
import { getRuntimeQualityProfile } from "../scene/runtimeQuality";
import { IngredientPortrait } from "./IngredientPortrait";

type MenuPanel = "home" | "grimoire" | "guide" | "settings" | "credits";

const GUIDE_STEPS = [
  ["I", "Kaufen", "Wähle eine der drei Zutaten im unteren Band. Erst nach dem sichtbaren Flug landet sie auf der Werkbank."],
  ["II", "Mischen", "Zwei identische Stufen verschmelzen automatisch. Größe, Runenringe und Wirkung wachsen dauerhaft."],
  ["III", "Anordnen", "Klicke Zutaten direkt auf dem Tisch an und tausche ihre Plätze, um Nachbarschaftsbuffs zu nutzen."],
  ["IV", "Kämpfen", "Deine Mischung kämpft automatisch. Cooldowns, Schaden, Schild, Heilung sowie Buffs bleiben jederzeit lesbar."],
] as const;

function PanelHeader({ eyebrow, title, onBack }: { eyebrow: string; title: string; onBack: () => void }) {
  return (
    <header className="main-menu-panel-header">
      <button aria-label="Zurück zum Hauptmenü" onClick={onBack} type="button">←</button>
      <span><small>{eyebrow}</small><strong>{title}</strong></span>
    </header>
  );
}

function Grimoire({ onBack }: { onBack: () => void }) {
  return (
    <section className="main-menu-panel grimoire-panel" aria-label="Zutatengrimoire">
      <PanelHeader eyebrow="SAMMLUNG" onBack={onBack} title="Zutatengrimoire" />
      <p>Alle bekannten Zutaten, ihre Grundwirkung und die Entwicklung bis Stufe III.</p>
      <div className="grimoire-grid">
        {ITEMS.map((definition) => {
          const copy = itemCopy(definition.id);
          const family = FAMILY_COPY[definition.family];
          return (
            <article className={`family-${definition.family}`} key={definition.id} style={{ "--grimoire-color": family.color } as CSSProperties}>
              <IngredientPortrait itemId={definition.id} level={3} />
              <span><small>{family.symbol} {family.name}</small><strong>{copy.name}</strong><p>{copy.short}</p></span>
              <dl><div><dt>Wirkung</dt><dd>{definition.values.join(" / ")}</dd></div><div><dt>Takt</dt><dd>{definition.cooldown.join(" / ")}s</dd></div></dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Guide({ onBack }: { onBack: () => void }) {
  return (
    <section className="main-menu-panel guide-panel" aria-label="Spielanleitung">
      <PanelHeader eyebrow="ANLEITUNG" onBack={onBack} title="Vom Laden zum Krawall" />
      <div className="guide-grid">
        {GUIDE_STEPS.map(([number, title, copy]) => <article key={number}><b>{number}</b><span><strong>{title}</strong><p>{copy}</p></span></article>)}
      </div>
      <aside><strong>Die drei Grundrollen</strong><div>{(["fire", "poison", "guard"] as const).map((family) => <span key={family} style={{ "--family-color": FAMILY_COPY[family].color } as CSSProperties}><i>{FAMILY_COPY[family].symbol}</i>{FAMILY_COPY[family].name}</span>)}</div></aside>
    </section>
  );
}

function Settings({ audio, onAudioLevel, onAudioToggle, onBack }: {
  audio: AudioSettings;
  onAudioLevel: (setting: "master" | "music" | "sfx" | "combat", value: number) => void;
  onAudioToggle: () => void;
  onBack: () => void;
}) {
  const quality = getRuntimeQualityProfile();
  return (
    <section className="main-menu-panel settings-panel" aria-label="Einstellungen">
      <PanelHeader eyebrow="OPTIONEN" onBack={onBack} title="Einstellungen" />
      <div className="settings-card">
        <header><span><small>Audio</small><strong>Hexenküche & Kampf</strong></span><button aria-pressed={audio.enabled} onClick={onAudioToggle} type="button">{audio.enabled ? "Audio aktiv" : "Stumm"}</button></header>
        {(["master", "music", "sfx", "combat"] as const).map((setting) => {
          const label = { master: "Gesamt", music: "Musik & Ambiente", sfx: "UI & Effekte", combat: "Kampfimpulse" }[setting];
          return <label key={setting}><span>{label}</span><output>{Math.round(audio[setting] * 100)}%</output><input aria-label={`${label} Lautstärke`} disabled={!audio.enabled} max="1" min="0" onChange={(event) => onAudioLevel(setting, Number(event.currentTarget.value))} step="0.01" type="range" value={audio[setting]} /></label>;
        })}
      </div>
      <div className="settings-card quality-card"><header><span><small>Grafikprofil</small><strong>Automatische Qualitätswahl</strong></span><b>{quality.tier === "mobile" ? "Mobil" : "Ausgewogen"}</b></header><p>Auflösung, Schatten und Umgebungsdetails passen sich automatisch an Display, Eingabegerät und verfügbare Hardware an.</p></div>
    </section>
  );
}

function Credits({ onBack }: { onBack: () => void }) {
  return (
    <section className="main-menu-panel credits-panel" aria-label="Credits und Lizenzen">
      <PanelHeader eyebrow="ARCHIV" onBack={onBack} title="Credits & Lizenzen" />
      <div className="credits-seal">◆</div>
      <p><strong>KesselKrawall 3D</strong><br />Eigenständiger 3D-Rebuild des ursprünglichen KesselKrawall-Spielkonzepts.</p>
      <dl><div><dt>Technik</dt><dd>React · TypeScript · Three.js · React Three Fiber</dd></div><div><dt>3D-Bausteine</dt><dd>Quaternius · KayKit · Magic Low Poly Pack</dd></div><div><dt>Audio</dt><dd>Kuratiertes, separat attribuiertes Musik- und Effektpaket</dd></div></dl>
      <a href="https://github.com/emfau88/KesselKrawall-3-D/blob/master/docs/ASSET_LICENSES.md" rel="noreferrer" target="_blank">Vollständiges Asset- und Lizenzregister ↗</a>
      <small>Build P2.5A · Browser Edition</small>
    </section>
  );
}

export function MainMenu({
  audio,
  game,
  hasContinue,
  progress,
  onAudioLevel,
  onAudioToggle,
  onContinue,
  onNavigate,
  onPlay,
}: {
  audio: AudioSettings;
  game: GameState;
  hasContinue: boolean;
  progress: PlayerProgress;
  onAudioLevel: (setting: "master" | "music" | "sfx" | "combat", value: number) => void;
  onAudioToggle: () => void;
  onContinue: () => void;
  onNavigate: () => void;
  onPlay: () => void;
}) {
  const [panel, setPanel] = useState<MenuPanel>("home");
  const navigate = (destination: MenuPanel) => {
    onNavigate();
    setPanel(destination);
  };
  if (panel === "grimoire") return <Grimoire onBack={() => navigate("home")} />;
  if (panel === "guide") return <Guide onBack={() => navigate("home")} />;
  if (panel === "settings") return <Settings audio={audio} onAudioLevel={onAudioLevel} onAudioToggle={onAudioToggle} onBack={() => navigate("home")} />;
  if (panel === "credits") return <Credits onBack={() => navigate("home")} />;
  const wins = (progress.campaigns["grand-tournament"]?.wins ?? 0) + (progress.campaigns["frostbound-vault"]?.wins ?? 0);
  return (
    <section className="main-menu" aria-label="Hauptmenü">
      <div className="main-menu-brand">
        <p>DAS GROSSE ALCHEMISTENTURNIER</p>
        <div className="title-sigil" aria-hidden="true"><i /><b>◆</b></div>
        <h1><span>Kessel</span><strong>Krawall</strong><em>3D</em></h1>
        <small>Brauen · Verschmelzen · Bezwingen</small>
      </div>
      <nav className="main-menu-nav" aria-label="Spielnavigation">
        <button className="primary" onClick={onPlay} type="button"><i>✦</i><span><strong>Spielen</strong><small>Kampagne wählen</small></span><b>›</b></button>
        {hasContinue && <button onClick={onContinue} type="button"><i>↗</i><span><strong>Fortsetzen</strong><small>{game.campaignId === "grand-tournament" ? "Großes Kesselturnier" : "Frostgebundenes Archiv"} · Runde {game.round}</small></span><b>›</b></button>}
        <button onClick={() => navigate("grimoire")} type="button"><i>◇</i><span><strong>Grimoire</strong><small>20 Zutaten entdecken</small></span><b>›</b></button>
        <button onClick={() => navigate("guide")} type="button"><i>?</i><span><strong>Anleitung</strong><small>Regeln und Synergien</small></span><b>›</b></button>
        <button onClick={() => navigate("settings")} type="button"><i>≋</i><span><strong>Einstellungen</strong><small>Audio und Grafik</small></span><b>›</b></button>
      </nav>
      <footer><button onClick={() => navigate("credits")} type="button">Credits & Lizenzen</button><span>{wins} Kampagnensiege</span></footer>
    </section>
  );
}
