import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { getItemDefinition } from "./core/data";
import { simulateBattle } from "./core/simulation";
import {
  loadPlayerProgress,
  loadStoredGame,
  persistGame,
  persistPlayerProgress,
  recordCampaignVictory,
} from "./core/storage";
import {
  advanceAfterBattle,
  beginBattle,
  buyOffer,
  createInitialState,
  enterOpeningShop,
  getBattleReward,
  getCurrentOpponent,
  getFamilyWeights,
  getPowerBreakdown,
  getPurchaseMergePreview,
  getSellValue,
  recordBattleResult,
  rerollShop,
  resetRun,
  selectOrSwapSlot,
  sellReserve,
  sellSlot,
  showBattleResult,
  SYNERGY_THRESHOLD,
  swapSlotWithReserve,
} from "./core/state";
import type {
  CampaignId,
  Board,
  CombatEvent,
  CombatResult,
  GameState,
  ItemLevel,
  LegacyFamily,
  PlayerProgress,
} from "./core/types";
import {
  audioDirector,
  DEFAULT_AUDIO_SETTINGS,
  normalizeAudioSettings,
  type AudioSettings,
  type SoundCue,
} from "./presentation/audio/audioDirector";
import {
  createEmptyCombatStatuses,
  createCombatTimeline,
  getBeatAt,
  getPlaybackElapsedMs,
  getTimelineProgress,
  type BattlePlaybackSpeed,
  type CombatTimeline,
} from "./presentation/combat/combatPresentation";
import {
  createFloatingCombatNumbers,
  formatFloatingCombatNumber,
  mergeFloatingCombatNumbers,
  type FloatingCombatNumber,
} from "./presentation/combat/floatingCombatNumbers";
import { getIngredientCooldownStates } from "./presentation/combat/ingredientCooldowns";
import { getPresentedInventory } from "./presentation/shop/purchasePresentation";
import { getItemPlacementInsights } from "./presentation/shop/itemInsights";
import {
  ERROR_MESSAGES,
  FAMILY_COPY,
  itemCopy,
  opponentName,
} from "./presentation/content/gameText";
import { getOpponentPresentation } from "./presentation/content/opponentPresentation";
import type { GreyboxMode } from "./presentation/scene/GreyboxStage";
import {
  getBattleCriticalAssetIds,
  preloadBattleAssets,
  type AssetLoadProgress,
} from "./presentation/scene/assetReadiness";
import type { ProductionAssetId } from "./presentation/scene/ProductionAsset";
import type { CombatFrame, PurchaseVisual } from "./presentation/scene/sceneTypes";
import { Onboarding, ONBOARDING_STEP_COUNT } from "./presentation/ui/Onboarding";
import { SceneErrorBoundary } from "./presentation/ui/SceneErrorBoundary";
import { CampaignPicker } from "./presentation/ui/CampaignPicker";
import { IngredientPortrait } from "./presentation/ui/IngredientPortrait";

const ONBOARDING_STORAGE_KEY = "kessel-krawall-3d-onboarding-v1";
const AUDIO_STORAGE_KEY = "kessel-krawall-3d-audio-v2";
const ROMAN_LEVEL = { 1: "I", 2: "II", 3: "III" } as const;

const GreyboxStage = lazy(() => import("./presentation/scene/GreyboxStage"));

interface Playback {
  readonly result: CombatResult;
  readonly timeline: CombatTimeline;
  readonly startedAt: number;
  readonly offsetMs: number;
  readonly speed: BattlePlaybackSpeed;
  readonly paused: boolean;
}

interface BattlePreparation {
  readonly id: number;
  readonly stage: "loading" | "decoding" | "error";
  readonly progress: AssetLoadProgress;
  readonly state: GameState;
  readonly result: CombatResult;
  readonly timeline: CombatTimeline;
  readonly opponent: ReturnType<typeof getCurrentOpponent>;
  readonly criticalAssets: readonly ProductionAssetId[];
  readonly errorMessage?: string;
}

function initialGame(): GameState {
  try {
    const stored = loadStoredGame(window.localStorage);
    if (stored?.phase === "shop" || stored?.phase === "intro") {
      return enterOpeningShop(stored);
    }
  } catch {
    // Local storage is an optional enhancement.
  }
  return enterOpeningShop(createInitialState(0x4b4b2026));
}

function eventText(event: CombatEvent | null): string {
  if (!event) return "Die Kessel heizen auf …";
  const source = event.sourceItemId ? itemCopy(event.sourceItemId).name : "Kesselmagie";
  switch (event.code) {
    case "item.damage": return `${source} trifft für ${event.amount}.`;
    case "item.poison": return `${source} legt ${event.amount} Gift auf.`;
    case "item.shield": return `${source} erzeugt ${event.amount} Schild.`;
    case "item.heal": return `${source} heilt ${event.amount}.`;
    case "status.poisonTick": return `Gift verursacht ${event.amount} Schaden.`;
    case "status.poisonBurst": return `Giftkollaps: ${event.amount} Schaden!`;
    case "status.burnApplied": return `${source} entzündet den Kessel.`;
    case "status.burnTick": return `Glut verursacht ${event.amount} Schaden.`;
    case "status.poisonCleansed": return `${event.amount} Gift wurde gereinigt.`;
    case "synergy.guardStart": return `Schutz-Synergie startet mit ${event.amount} Schild.`;
    case "synergy.frostDelay": return "Frost verzögert den Gegner.";
    case "synergy.echoRepeat": return "Echo wiederholt den letzten Impuls.";
    case "boss.rage": return "Der Boss gerät in Kesselwut!";
    case "boss.timeFracture": return "Der Chronokessel bricht die Zeit.";
  }
}

function hpPercent(current: number, maximum: number): string {
  return `${Math.max(0, Math.min(100, (current / Math.max(1, maximum)) * 100))}%`;
}

function initialOnboardingStep(): number | null {
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "complete" ? null : 0;
  } catch {
    return 0;
  }
}

function initialAudioSettings(): AudioSettings {
  try {
    const stored = window.localStorage.getItem(AUDIO_STORAGE_KEY);
    if (stored) return normalizeAudioSettings(JSON.parse(stored) as Partial<AudioSettings>);
    const legacy = window.localStorage.getItem("kessel-krawall-3d-audio-v1");
    return { ...DEFAULT_AUDIO_SETTINGS, enabled: legacy !== "muted" };
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

function initialProgress(): PlayerProgress {
  try {
    return loadPlayerProgress(window.localStorage);
  } catch {
    return { version: 1, campaigns: {} };
  }
}

function combatSound(event: CombatEvent): SoundCue {
  if (event.family === "fire" || event.sourceItemId === "chili") return "fire";
  if (event.kind === "poison" || event.kind === "poisonBurst") return "poison";
  if (event.kind === "shield" || event.kind === "cleanse") return "shield";
  if (event.kind === "heal") return "heal";
  if (event.kind === "frost") return "frost";
  if (event.kind === "echo") return "echo";
  if (event.kind === "boss") return "boss";
  return "damage";
}

function CombatStatusStrip({
  status,
  shield,
  elapsedMs,
}: {
  status: import("./presentation/combat/combatPresentation").CombatSideStatus;
  shield: number;
  elapsedMs: number;
}) {
  const timed = [
    status.poison.stacks > 0
      ? { key: "poison", symbol: "●", value: status.poison.stacks, label: "Gift", until: status.poison.nextTickAt - elapsedMs }
      : null,
    status.burn.stacks > 0
      ? { key: "burn", symbol: "♨", value: status.burn.stacks, label: "Brand", until: status.burn.nextTickAt - elapsedMs }
      : null,
  ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const permanent = [
    shield > 0 ? { key: "shield", symbol: "◇", value: shield, label: "Schild" } : null,
    status.rage ? { key: "rage", symbol: "!", value: "+25%", label: "Kesselwut" } : null,
    status.timeFracture ? { key: "time", symbol: "⌛", value: "+15%", label: "Zeitbruch" } : null,
    status.delayedUntil > elapsedMs ? { key: "delay", symbol: "❄", value: `${Math.max(0, (status.delayedUntil - elapsedMs) / 1_000).toFixed(1)}s`, label: "Verzögert" } : null,
  ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const entries = [...permanent, ...timed];
  if (entries.length === 0) return null;
  return (
    <div className="combat-status-strip" aria-label="Aktive Kampfeffekte">
      {entries.slice(0, 3).map((entry) => (
        <span className={`combat-status-badge status-${entry.key}`} key={entry.key} title={`${entry.label}: ${entry.value}`}>
          <i>{entry.symbol}</i><b>{entry.value}</b><small>{entry.label}</small>
          {"until" in entry && typeof entry.until === "number" && <em>{Math.max(0, entry.until / 1_000).toFixed(1)}s</em>}
        </span>
      ))}
      {entries.length > 3 && <span className="combat-status-more">+{entries.length - 3}</span>}
    </div>
  );
}

function CombatNumberLayer({ numbers }: { numbers: readonly FloatingCombatNumber[] }) {
  if (numbers.length === 0) return null;
  return (
    <div className="combat-number-layer" aria-hidden="true">
      {numbers.map((number) => {
        const copy = formatFloatingCombatNumber(number);
        return (
          <span
            className={`combat-floating-number target-${number.target} number-${number.type} ${number.hitCount > 1 ? "is-bundle" : ""}${number.value >= 12 ? " is-hero-hit" : ""}`}
            key={number.id}
          >
            <strong>{copy.value}</strong>
            <small>{copy.label}{number.hitCount > 1 ? ` · ×${number.hitCount}` : ""}</small>
          </span>
        );
      })}
    </div>
  );
}

function CombatIngredientRail({
  board,
  events,
  combat,
}: {
  board: Board;
  events: readonly CombatEvent[];
  combat: CombatFrame | null;
}) {
  const cooldowns = getIngredientCooldownStates(board, events, "player", combat?.elapsedMs ?? 0);
  return (
    <section className="combat-ingredient-rail" aria-label="Zutaten und Abklingzeiten">
      {board.map((item, index) => {
        if (!item) return null;
        const definition = getItemDefinition(item.itemId);
        const copy = itemCopy(item.itemId);
        const cooldown = cooldowns[index];
        const active = combat?.event?.sourceUid === item.uid;
        const style = {
          "--ingredient-color": FAMILY_COPY[definition.family].color,
          "--cooldown-turn": `${Math.round((cooldown?.progress ?? 0) * 360)}deg`,
        } as CSSProperties;
        return (
          <article className={`combat-ingredient family-${definition.family}${active ? " is-casting" : ""}`} key={item.uid} style={style}>
            <div className="combat-ingredient-dial" aria-hidden="true">
              <i>{FAMILY_COPY[definition.family].symbol}</i>
            </div>
            <span>
              <strong>{copy.name}</strong>
              <small>Stufe {ROMAN_LEVEL[item.level]} · {active ? "WIRKT" : `${Math.max(0, (cooldown?.remainingMs ?? 0) / 1_000).toFixed(1)}s`}</small>
            </span>
          </article>
        );
      })}
    </section>
  );
}

function IngredientContribution({ result }: { result: CombatResult }) {
  const totalDamage = result.playerStats.reduce((sum, stat) => sum + stat.totalDamage, 0);
  const maximumContribution = Math.max(
    1,
    ...result.playerStats.map((stat) => stat.totalDamage + stat.healing + stat.shield),
  );
  const ordered = [...result.playerStats].sort((left, right) =>
    (right.totalDamage + right.healing + right.shield) - (left.totalDamage + left.healing + left.shield),
  );
  return (
    <div className="result-contributions" aria-label="Zutatenbeiträge">
      <header><strong>Zutaten-Chronik</strong><span>{totalDamage} Gesamtschaden</span></header>
      {ordered.map((stat, index) => {
        const definition = getItemDefinition(stat.itemId);
        const score = stat.totalDamage + stat.healing + stat.shield;
        const detail = [
          stat.totalDamage > 0 ? `${stat.totalDamage} Schaden` : null,
          stat.shield > 0 ? `${stat.shield} Schild` : null,
          stat.healing > 0 ? `${stat.healing} Heilung` : null,
          stat.poisonApplied > 0 ? `${stat.poisonApplied} Gift` : null,
        ].filter(Boolean).join(" · ") || "Unterstützung";
        return (
          <article className={`family-${definition.family}`} key={stat.uid} style={{ "--contribution-width": `${Math.max(5, score / maximumContribution * 100)}%` } as CSSProperties}>
            <b>{index === 0 ? "★" : FAMILY_COPY[definition.family].symbol}</b>
            <span><strong>{itemCopy(stat.itemId).name} · {ROMAN_LEVEL[stat.level]}</strong><small>{detail}</small></span>
            <em>{stat.triggers}×</em>
            <i />
          </article>
        );
      })}
    </div>
  );
}

export function App() {
  const [game, setGame] = useState<GameState>(initialGame);
  const [notice, setNotice] = useState("Wähle eine Zutat. Gleiche Zutaten verschmelzen automatisch.");
  const [purchase, setPurchase] = useState<PurchaseVisual | null>(null);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [battleSpeed, setBattleSpeed] = useState<BattlePlaybackSpeed>(1);
  const [combat, setCombat] = useState<CombatFrame | null>(null);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingCombatNumber[]>([]);
  const [lastResult, setLastResult] = useState<CombatResult | null>(null);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(initialAudioSettings);
  const [audioPanelOpen, setAudioPanelOpen] = useState(false);
  const [battlePreparation, setBattlePreparation] = useState<BattlePreparation | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<number | null>(initialOnboardingStep);
  const [progress, setProgress] = useState<PlayerProgress>(initialProgress);
  const [campaignPickerOpen, setCampaignPickerOpen] = useState(false);
  const [reserveSelected, setReserveSelected] = useState(false);
  const animationId = useRef(1);
  const preparationId = useRef(1);
  const lastAudioEvent = useRef(-1);
  const lastFeedbackBeat = useRef<string | null>(null);
  const soundedResult = useRef<CombatResult | null>(null);
  const resultRevealTimer = useRef<number | null>(null);

  const presentedInventory = useMemo(
    () => getPresentedInventory(purchase, game.board, game.reserve),
    [game.board, game.reserve, purchase],
  );
  const presentedBoard = presentedInventory.board;
  const presentedReserve = presentedInventory.reserve;
  const opponent = useMemo(() => getCurrentOpponent(game), [game]);
  const stagedOpponent = battlePreparation?.opponent ?? opponent;
  const stagedPresentation = getOpponentPresentation(stagedOpponent.id);
  const familyWeights = useMemo(() => getFamilyWeights(presentedBoard), [presentedBoard]);
  const power = useMemo(() => getPowerBreakdown(presentedBoard), [presentedBoard]);
  const mode: GreyboxMode = battlePreparation ? "arena" :
    game.phase === "battle" || game.phase === "result" ||
    game.phase === "victory" || game.phase === "gameover"
      ? "arena"
      : "workshop";

  useEffect(() => {
    audioDirector.setSettings(audioSettings);
    audioDirector.warm();
  }, [audioSettings]);

  useEffect(() => {
    const scene = game.phase === "battle"
      ? opponent.rank === "boss" ? "boss" : "battle"
      : game.phase === "result" || game.phase === "victory" || game.phase === "gameover"
        ? "result"
        : "shop";
    audioDirector.setScene(scene);
  }, [game.phase, opponent.rank]);

  useEffect(() => {
    if (game.phase !== "shop" || battlePreparation) return;
    void preloadBattleAssets(game.board, opponent.board, opponent.id).catch(() => undefined);
  }, [battlePreparation, game.board, game.phase, opponent.board, opponent.id]);

  useEffect(() => {
    if (battlePreparation?.stage !== "loading" && battlePreparation?.stage !== "decoding") return;
    const timer = window.setTimeout(() => {
      setBattlePreparation((current) => current && current.id === battlePreparation.id
        ? {
            ...current,
            stage: "error",
            errorMessage: "Die Arena lädt ungewöhnlich lange. Du kannst sicher mit reduzierter Grafik fortfahren.",
          }
        : current);
    }, 12_000);
    return () => window.clearTimeout(timer);
  }, [battlePreparation?.id, battlePreparation?.stage]);

  useEffect(() => {
    try {
      persistGame(window.localStorage, game);
    } catch {
      // Private browsing or storage quotas must not block the game loop.
    }
  }, [game]);

  useEffect(() => {
    try {
      persistPlayerProgress(window.localStorage, progress);
    } catch {
      // Progress remains available for the current session.
    }
  }, [progress]);

  useEffect(() => {
    if (!playback || playback.paused) return;
    const timer = window.setInterval(() => {
      const presentationElapsedMs = Math.min(
        playback.timeline.durationMs,
        getPlaybackElapsedMs(
          playback.offsetMs,
          playback.startedAt,
          performance.now(),
          playback.speed,
          playback.paused,
        ),
      );
      const beat = getBeatAt(playback.timeline, presentationElapsedMs);
      const event = beat?.event ?? null;
      const snapshot = beat?.snapshot ?? null;
      setCombat({
        beatId: beat?.id ?? null,
        eventIndex: beat?.eventIndex ?? -1,
        event,
        events: beat?.events ?? [],
        emphasis: beat?.emphasis ?? null,
        statuses: beat?.statuses ?? createEmptyCombatStatuses(),
        elapsedMs: snapshot?.time ?? 0,
        playbackProgress: getTimelineProgress(playback.timeline, presentationElapsedMs),
        playerHp: snapshot?.playerHp ?? playback.result.playerMaxHp,
        playerShield: snapshot?.playerShield ?? 0,
        enemyHp: snapshot?.enemyHp ?? playback.result.enemyMaxHp,
        enemyShield: snapshot?.enemyShield ?? 0,
      });

      if (presentationElapsedMs >= playback.timeline.durationMs) {
        window.clearInterval(timer);
        setCombat({
          beatId: playback.timeline.beats.at(-1)?.id ?? null,
          eventIndex: playback.result.events.length,
          event: playback.result.events.at(-1) ?? null,
          events: playback.timeline.beats.at(-1)?.events ?? [],
          emphasis: playback.timeline.beats.at(-1)?.emphasis ?? null,
          statuses: playback.timeline.beats.at(-1)?.statuses ?? createEmptyCombatStatuses(),
          elapsedMs: playback.result.duration,
          playbackProgress: 1,
          playerHp: playback.result.finalPlayerHp,
          playerShield: playback.result.finalPlayerShield,
          enemyHp: playback.result.finalEnemyHp,
          enemyShield: playback.result.finalEnemyShield,
        });
        setPlayback(null);
        if (resultRevealTimer.current !== null) window.clearTimeout(resultRevealTimer.current);
        resultRevealTimer.current = window.setTimeout(() => {
          setGame((current) => showBattleResult(current));
          resultRevealTimer.current = null;
        }, 1_650);
      }
    }, 45);
    return () => window.clearInterval(timer);
  }, [playback]);

  useEffect(() => {
    const event = combat?.event;
    if (!event || combat.eventIndex === lastAudioEvent.current) return;
    lastAudioEvent.current = combat.eventIndex;
    audioDirector.playCombat(combatSound(event), event.sourceItemId, {
      emphasis: combat.emphasis === "boss" ? "hero" : combat.emphasis ?? "standard",
      pan: event.actor === "player" ? -0.22 : 0.22,
      opponentId: stagedOpponent.id,
      enemyCast: event.actor === "enemy",
    });
  }, [combat?.emphasis, combat?.event, combat?.eventIndex, stagedOpponent.id]);

  useEffect(() => {
    if (!combat?.beatId || combat.beatId === lastFeedbackBeat.current) return;
    lastFeedbackBeat.current = combat.beatId;
    const now = performance.now();
    const incoming = createFloatingCombatNumbers(combat.events, combat.beatId, now);
    if (incoming.length === 0) return;
    setFloatingNumbers((current) => mergeFloatingCombatNumbers(current, incoming, now));
    window.setTimeout(() => {
      const expiry = performance.now();
      setFloatingNumbers((current) => current.filter((number) => number.expiresAt > expiry));
    }, 1_180);
  }, [combat?.beatId, combat?.events]);

  useEffect(() => {
    if (game.phase !== "result" || !game.pendingBattle || soundedResult.current === game.pendingBattle) return;
    soundedResult.current = game.pendingBattle;
    audioDirector.play(game.pendingBattle.winner === "player" ? "victory" : "defeat");
  }, [game.pendingBattle, game.phase]);

  useEffect(() => {
    if (!purchase) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reducedMotion
      ? purchase.phase === "merge" ? 140 : 90
      : purchase.phase === "flight"
        ? 680
        : purchase.phase === "landing"
          ? 180
          : purchase.phase === "merge"
            ? 620
            : 260;
    const timer = window.setTimeout(() => {
      setPurchase((current) => {
        if (!current || current.id !== purchase.id) return current;
        if (current.phase === "flight") return { ...current, phase: "landing" };
        if (current.phase === "landing") {
          if (current.merges.length > 0) {
            audioDirector.play(current.merges[0]?.toLevel === 3 ? "merge3" : "merge2");
            return { ...current, phase: "merge", mergeStepIndex: 0 };
          }
          return { ...current, phase: "reveal" };
        }
        if (current.phase === "merge") {
          if (current.mergeStepIndex + 1 < current.merges.length) {
            audioDirector.play(current.merges[current.mergeStepIndex + 1]?.toLevel === 3 ? "merge3" : "merge2");
            return { ...current, mergeStepIndex: current.mergeStepIndex + 1 };
          }
          return { ...current, phase: "reveal" };
        }
        return null;
      });
    }, duration);
    return () => window.clearTimeout(timer);
  }, [purchase]);

  function playError(message: string) {
    setNotice(message);
    audioDirector.play("error");
  }

  function finishOnboarding() {
    setOnboardingStep(null);
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "complete");
    } catch {
      // Storage is optional; the game remains playable without it.
    }
  }

  function handleOnboardingNext() {
    if (onboardingStep === null || onboardingStep >= ONBOARDING_STEP_COUNT - 1) {
      finishOnboarding();
      return;
    }
    setOnboardingStep(onboardingStep + 1);
    audioDirector.play("select");
  }

  function handleAudioToggle() {
    const next = { ...audioSettings, enabled: !audioSettings.enabled };
    setAudioSettings(next);
    audioDirector.setSettings(next);
    try {
      window.localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage is optional; the in-memory setting still applies.
    }
  }

  function handleAudioLevel(setting: "master" | "music" | "sfx" | "combat", value: number) {
    const next = normalizeAudioSettings({ ...audioSettings, [setting]: value });
    setAudioSettings(next);
    audioDirector.setSettings(next);
    try {
      window.localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage is optional; the in-memory setting still applies.
    }
  }

  function handleBuy(offerUid: string) {
    if (purchase) return;
    const offerIndex = game.offers.findIndex((offer) => offer.uid === offerUid);
    const result = buyOffer(game, offerUid);
    if (result.error) {
      playError(ERROR_MESSAGES[result.error]);
      return;
    }
    const committed = result.events.find((event) => event.type === "purchaseCommitted");
    const merges = result.events.filter((event) => event.type === "mergeResolved");
    const synergy = result.events.find(
      (event) => event.type === "synergyChanged" && event.active,
    );
    setGame(result.state);
    if (committed?.type === "purchaseCommitted") {
      const finalMerge = merges.at(-1);
      const resultLevel: ItemLevel =
        finalMerge?.type === "mergeResolved" ? finalMerge.step.toLevel : 1;
      setPurchase({
        id: animationId.current++,
        itemId: committed.itemId,
        offerIndex: Math.max(0, offerIndex),
        destinationSlot: committed.destination.area === "board"
          ? committed.destination.slot
          : "reserve",
        resultLevel,
        merged: merges.length > 0,
        merges: merges.flatMap((event) => event.type === "mergeResolved" ? [event.step] : []),
        beforeBoard: game.board,
        beforeReserve: game.reserve,
        afterBoard: result.state.board,
        afterReserve: result.state.reserve,
        phase: "flight",
        mergeStepIndex: 0,
      });
      const copy = itemCopy(committed.itemId);
      setNotice(
        synergy?.type === "synergyChanged"
          ? `${FAMILY_COPY[synergy.family].name}-Synergie aktiviert!`
          : merges.length > 0
            ? `${copy.name} verschmilzt zu Stufe ${resultLevel}.`
            : committed.destination.area === "reserve"
              ? `${copy.name} wartet in der Reserve.`
              : `${copy.name} landet auf der Werkbank.`,
      );
      audioDirector.play("purchase");
    }
  }

  function handleReroll() {
    if (purchase) return;
    const result = rerollShop(game);
    if (result.error) {
      playError(ERROR_MESSAGES[result.error]);
      return;
    }
    setGame(result.state);
    setPurchase(null);
    const event = result.events[0];
    const cost = event?.type === "shopRerolled" ? event.cost : 0;
    setNotice(cost === 0 ? "Die erste Neuauslage ist kostenlos." : "Drei neue Zutaten liegen bereit.");
    audioDirector.play("reroll");
  }

  function handleSelectSlot(slot: number) {
    if (purchase) return;
    const result = selectOrSwapSlot(game, slot);
    setGame(result.state);
    setReserveSelected(false);
    audioDirector.play("select");
    if (game.selectedSlot !== null && game.selectedSlot !== slot) {
      setNotice("Zutatenplätze getauscht. Nachbarschaftseffekte wurden neu berechnet.");
    } else if (presentedBoard[slot]) {
      setNotice(`${itemCopy(presentedBoard[slot]?.itemId ?? "").name} ausgewählt.`);
    }
  }

  function handleSelectReserve() {
    if (purchase) return;
    if (game.round < 5) return;
    if (game.selectedSlot !== null) {
      const result = swapSlotWithReserve(game, game.selectedSlot);
      setGame(result.state);
      setReserveSelected(false);
      setNotice("Reserve und Werkbankplatz wurden getauscht.");
      audioDirector.play("select");
      return;
    }
    setReserveSelected((selected) => !selected);
    audioDirector.play("select");
  }

  function handleSellReserve() {
    if (purchase) return;
    const result = sellReserve(game);
    if (result.error) {
      playError(ERROR_MESSAGES[result.error]);
      return;
    }
    setGame(result.state);
    setReserveSelected(false);
    setNotice("Reservezutat verkauft.");
    audioDirector.play("sell");
  }

  function handleSellSelected() {
    if (purchase) return;
    if (game.selectedSlot === null) return;
    const item = game.board[game.selectedSlot];
    const result = sellSlot(game, game.selectedSlot);
    if (result.error) {
      playError(ERROR_MESSAGES[result.error]);
      return;
    }
    setGame(result.state);
    setNotice(`${item ? itemCopy(item.itemId).name : "Zutat"} für ${item ? getSellValue(item) : 0} Gold verkauft.`);
    audioDirector.play("sell");
  }

  function handleStartBattle() {
    if (purchase || battlePreparation) return;
    if (resultRevealTimer.current !== null) {
      window.clearTimeout(resultRevealTimer.current);
      resultRevealTimer.current = null;
    }
    const started = beginBattle(game);
    if (started.error) {
      playError(ERROR_MESSAGES[started.error]);
      return;
    }
    const nextOpponent = getCurrentOpponent(started.state);
    const result = simulateBattle(started.state.board, nextOpponent);
    const withResult = recordBattleResult(started.state, result);
    const timeline = createCombatTimeline(result.events);
    const id = preparationId.current++;
    const criticalAssets = getBattleCriticalAssetIds(started.state.board, nextOpponent.board, nextOpponent.id);
    setPurchase(null);
    setReserveSelected(false);
    setFloatingNumbers([]);
    lastFeedbackBeat.current = null;
    setCombat({
      beatId: null,
      eventIndex: -1,
      event: null,
      events: [],
      emphasis: null,
      statuses: createEmptyCombatStatuses(),
      elapsedMs: 0,
      playbackProgress: 0,
      playerHp: result.playerMaxHp,
      playerShield: 0,
      enemyHp: result.enemyMaxHp,
      enemyShield: 0,
    });
    setBattlePreparation({
      id,
      stage: "loading",
      progress: { completed: 0, total: criticalAssets.length, percent: 0, currentAsset: null },
      state: withResult,
      result,
      timeline,
      opponent: nextOpponent,
      criticalAssets,
    });
    setNotice(`Arena für ${opponentName(nextOpponent.id)} wird vorbereitet …`);
    void preloadBattleAssets(
      started.state.board,
      nextOpponent.board,
      nextOpponent.id,
      (progress) => setBattlePreparation((current) => current?.id === id ? { ...current, progress } : current),
    ).then((assets) => {
      setBattlePreparation((current) => current?.id === id && current.stage === "loading"
        ? { ...current, stage: "decoding", criticalAssets: assets }
        : current);
    }).catch((error: unknown) => {
      setBattlePreparation((current) => current?.id === id
        ? {
            ...current,
            stage: "error",
            errorMessage: error instanceof Error ? error.message : "Die Arena konnte nicht vollständig geladen werden.",
          }
        : current);
    });
  }

  function commitPreparedBattle(preparation: BattlePreparation) {
    const speed: BattlePlaybackSpeed = game.round === 1 ? 1 : 2;
    setGame(preparation.state);
    setLastResult(preparation.result);
    setBattleSpeed(speed);
    setPlayback({
      result: preparation.result,
      timeline: preparation.timeline,
      startedAt: performance.now(),
      offsetMs: 0,
      speed,
      paused: false,
    });
    setBattlePreparation(null);
    setNotice(`Kessel an! ${opponentName(preparation.opponent.id)} ist bereit.`);
    lastAudioEvent.current = -1;
    audioDirector.play("battleStart");
  }

  function handleSceneReady(readinessKey: string) {
    if (!battlePreparation || battlePreparation.stage !== "decoding") return;
    if (readinessKey !== `${battlePreparation.id}:decoded`) return;
    commitPreparedBattle(battlePreparation);
  }

  function handleReducedGraphicsStart() {
    if (!battlePreparation) return;
    commitPreparedBattle(battlePreparation);
  }

  function handlePreparationCancel() {
    setBattlePreparation(null);
    setCombat(null);
    setNotice("Kampfvorbereitung abgebrochen. Deine Werkbank bleibt unverändert.");
  }

  function handleBattleSpeed(speed: BattlePlaybackSpeed) {
    setBattleSpeed(speed);
    setPlayback((current) => {
      if (!current) return current;
      const now = performance.now();
      return {
        ...current,
        offsetMs: getPlaybackElapsedMs(
          current.offsetMs,
          current.startedAt,
          now,
          current.speed,
          current.paused,
        ),
        startedAt: now,
        speed,
      };
    });
    audioDirector.play("select");
  }

  function handleBattlePause() {
    setPlayback((current) => {
      if (!current) return current;
      const now = performance.now();
      const offsetMs = getPlaybackElapsedMs(
        current.offsetMs,
        current.startedAt,
        now,
        current.speed,
        current.paused,
      );
      return {
        ...current,
        offsetMs,
        startedAt: now,
        paused: !current.paused,
      };
    });
    audioDirector.play("select");
  }

  function handleAdvance() {
    const result = game.pendingBattle;
    if (!result) return;
    const advanced = advanceAfterBattle(game, result.winner);
    setGame(advanced.state);
    setCombat(null);
    setPurchase(null);
    setBattlePreparation(null);
    if (advanced.state.phase === "shop") setLastResult(null);
    if (advanced.state.phase === "victory") {
      setProgress((current) =>
        recordCampaignVictory(current, game.campaignId, game.seals, power.total),
      );
    }
    const event = advanced.events[0];
    const reward = event?.type === "battleAdvanced" ? event.reward : 0;
    setNotice(
      advanced.state.phase === "shop"
        ? result.winner === "player"
          ? `Sieg! ${reward} Gold Belohnung. Die nächste Auslage wartet.`
          : `Neuer Versuch: ${reward} Gold Starthilfe.`
        : result.winner === "player"
          ? "Das Turnier gehört dir!"
          : "Der Kessel ist leer. Zeit für einen neuen Lauf.",
    );
  }

  function startCampaign(campaignId: CampaignId, legacyFamily?: LegacyFamily) {
    setGame(enterOpeningShop(resetRun(Date.now() >>> 0, campaignId, legacyFamily)));
    setPurchase(null);
    setPlayback(null);
    setCombat(null);
    setLastResult(null);
    setBattlePreparation(null);
    setReserveSelected(false);
    setCampaignPickerOpen(false);
    setNotice("Neuer Lauf, neue Mischung. Wähle deine erste Zutat.");
    audioDirector.play("battleStart");
  }

  const selectedItem = game.selectedSlot === null ? null : (presentedBoard[game.selectedSlot] ?? null);
  const selectedInsights = game.selectedSlot === null || !selectedItem
    ? null
    : getItemPlacementInsights(presentedBoard, game.selectedSlot);
  const battleResult = battlePreparation?.result ?? game.pendingBattle ?? lastResult;
  const playerHp = combat?.playerHp ?? battleResult?.finalPlayerHp ?? 100;
  const enemyHp = combat?.enemyHp ?? battleResult?.finalEnemyHp ?? stagedOpponent.baseHp;
  const battleProgress = (combat?.playbackProgress ?? 0) * 100;

  return (
    <main
      className={`game-shell phase-${game.phase} encounter-${stagedOpponent.id}${battlePreparation ? " is-preparing-battle" : ""}`}
      style={{
        "--encounter-accent": stagedPresentation.glow,
        "--encounter-secondary": stagedPresentation.secondaryGlow,
        "--encounter-surface": stagedPresentation.floor,
        "--encounter-banner": stagedPresentation.banner,
      } as CSSProperties}
    >
      <SceneErrorBoundary>
        <Suspense fallback={<div className="scene-loading"><i /><span>Werkstatt wird angeheizt …</span></div>}>
          <GreyboxStage
            mode={mode}
            criticalAssets={battlePreparation?.stage === "decoding" ? battlePreparation.criticalAssets : []}
            onSceneReady={handleSceneReady}
            readinessKey={battlePreparation?.stage === "decoding" ? `${battlePreparation.id}:decoded` : undefined}
            workshop={{
              board: presentedBoard,
              selectedSlot: game.selectedSlot,
              reserve: presentedReserve,
              reserveUnlocked: game.round >= 5,
              reserveSelected,
              purchase,
              onSelectSlot: handleSelectSlot,
              onSelectReserve: handleSelectReserve,
            }}
            arena={{
              board: battlePreparation?.state.board ?? game.board,
              opponent: stagedOpponent,
              combat,
              events: battleResult?.events ?? [],
              outcome: battlePreparation || (game.phase === "battle" && playback) ? null : battleResult?.winner ?? null,
            }}
          />
        </Suspense>
      </SceneErrorBoundary>

      <header className="game-title" aria-live="polite">
        <p>KESSELKRAWALL 3D · RUNDE {game.round}</p>
        <h1>{mode === "workshop" ? "Hexenwerkbank" : opponentName(stagedOpponent.id)}</h1>
        <span>{mode === "workshop" ? notice : eventText(combat?.event ?? null)}</span>
      </header>

      <section className="run-stats" aria-label="Laufstatus">
        <div><span>Gold</span><strong>{game.gold}</strong></div>
        <div><span>Siegel</span><strong>{"◆".repeat(game.seals) || "–"}</strong></div>
        <div><span>Kraft</span><strong>{power.total}</strong></div>
      </section>

      <nav className="utility-controls" aria-label="Spieleinstellungen">
        <button
          aria-label={audioSettings.enabled ? "Audio ausschalten" : "Audio einschalten"}
          aria-pressed={audioSettings.enabled}
          onClick={handleAudioToggle}
          type="button"
        >
          {audioSettings.enabled ? "♪" : "×"}
          <span>{audioSettings.enabled ? "Ton" : "Stumm"}</span>
        </button>
        <button
          aria-label="Audiomischung öffnen"
          aria-expanded={audioPanelOpen}
          onClick={() => setAudioPanelOpen((open) => !open)}
          type="button"
        >
          ≋<span>Mix</span>
        </button>
        <button
          aria-label="Kurzeinführung anzeigen"
          onClick={() => setOnboardingStep(0)}
          type="button"
        >
          ?<span>Hilfe</span>
        </button>
        <button
          aria-label="Neuen Lauf und Kampagne wählen"
          onClick={() => setCampaignPickerOpen(true)}
          type="button"
        >
          ↺<span>Lauf</span>
        </button>
      </nav>

      {audioPanelOpen && (
        <section className="audio-mixer" aria-label="Audiomischung">
          <header><strong>Audiomischung</strong><button aria-label="Audiomischung schließen" onClick={() => setAudioPanelOpen(false)} type="button">×</button></header>
          {([
            ["master", "Gesamt"],
            ["music", "Musik & Ambiente"],
            ["sfx", "UI & Effekte"],
            ["combat", "Kampfeffekte"],
          ] as const).map(([setting, label]) => (
            <label key={setting}>
              <span>{label}</span><output>{Math.round(audioSettings[setting] * 100)}%</output>
              <input
                aria-label={`${label} Lautstärke`}
                max="1"
                min="0"
                onChange={(event) => handleAudioLevel(setting, Number(event.currentTarget.value))}
                step="0.01"
                type="range"
                value={audioSettings[setting]}
              />
            </label>
          ))}
        </section>
      )}

      {battlePreparation && (
        <section className="battle-preparation" role="dialog" aria-modal="true" aria-label="Arena wird vorbereitet">
          <div className="preparation-sigil" aria-hidden="true"><i /><b>◆</b></div>
          <p>{battlePreparation.stage === "error" ? "ARENA NICHT VOLLSTÄNDIG" : "KESSEL WERDEN POSITIONIERT"}</p>
          <h2>{opponentName(battlePreparation.opponent.id)}</h2>
          <strong className="opponent-epithet">{stagedPresentation.title}</strong>
          {battlePreparation.stage === "error" ? (
            <span>{battlePreparation.errorMessage}</span>
          ) : (
            <span>{battlePreparation.stage === "loading" ? stagedPresentation.intro : "Magie wird entzündet · erster Frame wird geprüft"}</span>
          )}
          <div className="preparation-progress" aria-label={`${battlePreparation.progress.percent} Prozent geladen`}>
            <i style={{ width: `${battlePreparation.stage === "decoding" ? 100 : battlePreparation.progress.percent}%` }} />
          </div>
          <small>{battlePreparation.stage === "decoding" ? "Grafik wird aufgebaut …" : `${battlePreparation.progress.completed}/${battlePreparation.progress.total} kritische Pakete`}</small>
          <div className="preparation-actions">
            {battlePreparation.stage === "error" && <button className="continue-reduced" onClick={handleReducedGraphicsStart} type="button">Mit reduzierter Grafik starten</button>}
            <button onClick={handlePreparationCancel} type="button">Zurück zur Werkbank</button>
          </div>
        </section>
      )}

      {mode === "workshop" && (
        <>
          <section className="synergy-strip" aria-label="Synergien">
            {game.activeFamilies.map((family) => {
              const active = familyWeights[family] >= SYNERGY_THRESHOLD;
              return (
                <div
                  className={active ? "synergy is-active" : "synergy"}
                  key={family}
                  style={{ "--family-color": FAMILY_COPY[family].color } as CSSProperties}
                >
                  <span>{FAMILY_COPY[family].symbol}</span>
                  <strong>{FAMILY_COPY[family].name}</strong>
                  <small>{familyWeights[family]}/{SYNERGY_THRESHOLD}</small>
                </div>
              );
            })}
          </section>

          {selectedItem && game.selectedSlot !== null && (
            <aside className="selection-popover">
              <span>Platz {game.selectedSlot + 1}</span>
              <strong>{itemCopy(selectedItem.itemId).name} · Stufe {ROMAN_LEVEL[selectedItem.level]}</strong>
              <p>{itemCopy(selectedItem.itemId).short}</p>
              {selectedInsights && (
                <div className="placement-insights">
                  <span>
                    <b>Takt</b>
                    {selectedInsights.effectiveCooldownMs < selectedInsights.baseCooldownMs
                      ? `${(selectedInsights.baseCooldownMs / 1_000).toFixed(1)}s → ${(selectedInsights.effectiveCooldownMs / 1_000).toFixed(1)}s`
                      : `${(selectedInsights.baseCooldownMs / 1_000).toFixed(1)}s`}
                  </span>
                  <span className={selectedInsights.outgoing.length > 0 ? "is-active" : undefined}>
                    <b>Wirkt auf</b>
                    {selectedInsights.outgoing.length > 0
                      ? `Platz ${selectedInsights.outgoing.map((entry) => entry.targetSlot + 1).join(", ")} · +${Math.round(Math.max(...selectedInsights.outgoing.map((entry) => entry.value)) * 100)}%`
                      : "keine andere Zutat"}
                  </span>
                  <span className={selectedInsights.incoming.length > 0 ? "is-active" : undefined}>
                    <b>Profitiert von</b>
                    {selectedInsights.incoming.length > 0
                      ? `Platz ${selectedInsights.incoming.map((entry) => entry.sourceSlot + 1).join(", ")}`
                      : "keinem Platzierungsbuff"}
                  </span>
                </div>
              )}
              <button type="button" disabled={Boolean(purchase)} onClick={handleSellSelected}>
                Verkaufen · +{getSellValue(selectedItem)} Gold
              </button>
            </aside>
          )}

          {reserveSelected && presentedReserve && (
            <aside className="selection-popover reserve-popover">
              <span>Reserve</span>
              <strong>{itemCopy(presentedReserve.itemId).name} · Stufe {ROMAN_LEVEL[presentedReserve.level]}</strong>
              <p>Wähle einen Werkbankplatz zum Tauschen oder verkaufe die Reservezutat.</p>
              <button type="button" disabled={Boolean(purchase)} onClick={handleSellReserve}>
                Verkaufen · +{getSellValue(presentedReserve)} Gold
              </button>
            </aside>
          )}

          <section className="shop-ribbon" aria-label="Zutatenladen">
            <div className="shop-heading">
              <span>Wanderladen</span>
              <button type="button" disabled={Boolean(purchase)} onClick={handleReroll}>
                Neu mischen · {game.rerollsUsed === 0 ? "gratis" : "1 Gold"}
              </button>
            </div>
            <div className="offers">
              {game.offers.map((offer) => {
                const definition = getItemDefinition(offer.itemId);
                const copy = itemCopy(offer.itemId);
                const preview = getPurchaseMergePreview(
                  presentedBoard,
                  offer.itemId,
                  presentedReserve,
                  game.round >= 5,
                );
                return (
                  <button
                    className={`offer family-${definition.family}`}
                    disabled={offer.bought || Boolean(purchase)}
                    key={offer.uid}
                    onClick={() => handleBuy(offer.uid)}
                    type="button"
                  >
                    <IngredientPortrait itemId={offer.itemId} />
                    <span className="offer-copy">
                      <strong>{offer.bought ? "Verkauft" : copy.name}</strong>
                      <small>{preview ? `Stufe I + Bestand → Stufe ${ROMAN_LEVEL[preview.resultLevel]}${preview.mergeCount > 1 ? ` · ${preview.mergeCount}×` : ""}` : `Stufe I · ${copy.short}`}</small>
                    </span>
                    <span className="offer-cost">{definition.cost} ◉</span>
                  </button>
                );
              })}
            </div>
            <button className="mobile-reroll" disabled={Boolean(purchase)} type="button" onClick={handleReroll} aria-label="Angebote neu mischen">
              ↻<small>{game.rerollsUsed === 0 ? "gratis" : "1 Gold"}</small>
            </button>
            <button
              className="battle-button"
              disabled={!presentedBoard.some(Boolean) || Boolean(purchase)}
              onClick={handleStartBattle}
              type="button"
            >
              Gegen {opponentName(opponent.id)}
              <small>Kampf starten</small>
            </button>
          </section>
        </>
      )}

      {mode === "workshop" && purchase && purchase.phase !== "flight" && (
        <section className={`purchase-feedback phase-${purchase.phase}`} aria-live="assertive">
          {purchase.phase === "merge" ? (() => {
            const step = purchase.merges[purchase.mergeStepIndex];
            const definition = getItemDefinition(purchase.itemId);
            if (!step) return null;
            return (
              <>
                <span>VERSCHMELZUNG {purchase.merges.length > 1 ? `${purchase.mergeStepIndex + 1}/${purchase.merges.length}` : ""}</span>
                <strong>{itemCopy(purchase.itemId).name} · Stufe {ROMAN_LEVEL[step.toLevel]}</strong>
                <div><b>{ROMAN_LEVEL[step.fromLevel]}</b><i>+</i><b>{ROMAN_LEVEL[step.fromLevel]}</b><i>→</i><em>{ROMAN_LEVEL[step.toLevel]}</em></div>
                <small>Wirkung {definition.values[step.fromLevel - 1]} → {definition.values[step.toLevel - 1]} · Takt {definition.cooldown[step.fromLevel - 1]}s → {definition.cooldown[step.toLevel - 1]}s</small>
              </>
            );
          })() : (
            <><span>{purchase.phase === "landing" ? "LANDUNG" : "BEREIT"}</span><strong>{itemCopy(purchase.itemId).name} · Stufe {ROMAN_LEVEL[purchase.resultLevel]}</strong></>
          )}
        </section>
      )}

      {mode === "arena" && !battlePreparation && (
        <section className="battle-hud" aria-label="Kampfstatus">
          <div className="combatant player-health">
            <div><strong>Dein Kessel</strong><span>{playerHp} +{combat?.playerShield ?? 0}</span></div>
            <div className="health-track"><i style={{ width: hpPercent(playerHp, battleResult?.playerMaxHp ?? 100) }} /></div>
            <CombatStatusStrip
              elapsedMs={combat?.elapsedMs ?? 0}
              shield={combat?.playerShield ?? 0}
              status={combat?.statuses.player ?? createEmptyCombatStatuses().player}
            />
          </div>
          <div className="battle-clock">
            <span>{playback?.paused ? "PAUSE" : `${Math.ceil(Math.max(0, (battleResult?.duration ?? 0) - (combat?.elapsedMs ?? 0)) / 1000)}s`}</span>
            <i style={{ width: `${battleProgress}%` }} />
            <div className="battle-playback-controls" aria-label="Kampfgeschwindigkeit">
              <button aria-label={playback?.paused ? "Kampf fortsetzen" : "Kampf pausieren"} aria-pressed={playback?.paused ?? false} onClick={handleBattlePause} type="button">
                {playback?.paused ? "▶" : "Ⅱ"}
              </button>
              {([1, 2, 4] as const).map((speed) => (
                <button aria-pressed={battleSpeed === speed} className={battleSpeed === speed ? "is-active" : undefined} key={speed} onClick={() => handleBattleSpeed(speed)} type="button">
                  {speed}×
                </button>
              ))}
            </div>
          </div>
          <div className="combatant enemy-health">
            <small className="opponent-epithet">{stagedPresentation.title}</small>
            <div><strong>{opponentName(stagedOpponent.id)}</strong><span>{enemyHp} +{combat?.enemyShield ?? 0}</span></div>
            <div className="health-track"><i style={{ width: hpPercent(enemyHp, battleResult?.enemyMaxHp ?? stagedOpponent.baseHp) }} /></div>
            <CombatStatusStrip
              elapsedMs={combat?.elapsedMs ?? 0}
              shield={combat?.enemyShield ?? 0}
              status={combat?.statuses.enemy ?? createEmptyCombatStatuses().enemy}
            />
          </div>
        </section>
      )}

      {mode === "arena" && <CombatNumberLayer numbers={floatingNumbers} />}

      {mode === "arena" && game.phase === "battle" && !battlePreparation && battleResult && (
        <CombatIngredientRail board={game.board} combat={combat} events={battleResult.events} />
      )}

      {mode === "arena" && game.phase === "battle" && !playback && battleResult && (
        <section className={`ko-sequence winner-${battleResult.winner} reason-${battleResult.reason}`} aria-live="assertive">
          <span>{battleResult.reason === "knockout" ? "KESSEL" : "KAMPFZEIT"}</span>
          <strong>{battleResult.reason === "knockout" ? "K. O." : "ENDE"}</strong>
          <small>{battleResult.reason === "knockout"
            ? battleResult.winner === "player" ? `${opponentName(stagedOpponent.id)} ist geschlagen` : "Dein Sud ist versiegt"
            : battleResult.winner === "player" ? "Du führst nach Wirkung" : "Der Gegner führt nach Wirkung"}</small>
        </section>
      )}

      {(game.phase === "result" || game.phase === "victory" || game.phase === "gameover") && battleResult && (
        <section className="result-panel" role="dialog" aria-modal="true" aria-label="Kampfergebnis">
          <p>{battleResult.winner === "player" ? "KESSEL-SIEG" : battleResult.winner === "enemy" ? "KESSEL GESTÜRZT" : "GLEICHSTAND"}</p>
          <h2>{battleResult.winner === "player" ? "Sauber gebraut!" : battleResult.winner === "enemy" ? "Noch einmal umrühren." : "Beide Kessel dampfen noch."}</h2>
          <small className="result-opponent">{opponentName(stagedOpponent.id)} · {stagedPresentation.title}</small>
          <div className="result-stats">
            <span>{Math.round(battleResult.duration / 100) / 10}s Kampf</span>
            <span>{battleResult.playerStats.reduce((sum, stat) => sum + stat.totalDamage, 0)} Schaden</span>
            <span>{getBattleReward(game, battleResult.winner)} Gold</span>
          </div>
          <IngredientContribution result={battleResult} />
          {game.phase === "result" ? (
            <button type="button" onClick={handleAdvance}>Zurück zur Werkbank</button>
          ) : (
            <button type="button" onClick={() => setCampaignPickerOpen(true)}>Neue Kampagne wählen</button>
          )}
        </section>
      )}

      {mode === "workshop" && !selectedItem && presentedBoard.some(Boolean) && (
        <p className="interaction-hint">Zutat anklicken, dann einen zweiten Platz wählen: tauschen.</p>
      )}

      {onboardingStep !== null && mode === "workshop" && (
        <Onboarding
          onNext={handleOnboardingNext}
          onSkip={finishOnboarding}
          step={onboardingStep}
        />
      )}

      {campaignPickerOpen && (
        <CampaignPicker
          onClose={() => setCampaignPickerOpen(false)}
          onStart={startCampaign}
          progress={progress}
        />
      )}
    </main>
  );
}
