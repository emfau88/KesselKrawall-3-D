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
  CombatEvent,
  CombatResult,
  GameState,
  ItemLevel,
  LegacyFamily,
  PlayerProgress,
} from "./core/types";
import { audioDirector, type SoundCue } from "./presentation/audio/audioDirector";
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
import { getPresentedInventory } from "./presentation/shop/purchasePresentation";
import { getItemPlacementInsights } from "./presentation/shop/itemInsights";
import {
  ERROR_MESSAGES,
  FAMILY_COPY,
  itemCopy,
  opponentName,
} from "./presentation/content/gameText";
import type { GreyboxMode } from "./presentation/scene/GreyboxStage";
import type { CombatFrame, PurchaseVisual } from "./presentation/scene/sceneTypes";
import { Onboarding, ONBOARDING_STEP_COUNT } from "./presentation/ui/Onboarding";
import { SceneErrorBoundary } from "./presentation/ui/SceneErrorBoundary";
import { CampaignPicker } from "./presentation/ui/CampaignPicker";

const ONBOARDING_STORAGE_KEY = "kessel-krawall-3d-onboarding-v1";
const AUDIO_STORAGE_KEY = "kessel-krawall-3d-audio-v1";
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

function initialAudioEnabled(): boolean {
  try {
    return window.localStorage.getItem(AUDIO_STORAGE_KEY) !== "muted";
  } catch {
    return true;
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
            className={`combat-floating-number target-${number.target} number-${number.type} ${number.hitCount > 1 ? "is-bundle" : ""}`}
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

export function App() {
  const [game, setGame] = useState<GameState>(initialGame);
  const [notice, setNotice] = useState("Wähle eine Zutat. Gleiche Zutaten verschmelzen automatisch.");
  const [purchase, setPurchase] = useState<PurchaseVisual | null>(null);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [battleSpeed, setBattleSpeed] = useState<BattlePlaybackSpeed>(1);
  const [combat, setCombat] = useState<CombatFrame | null>(null);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingCombatNumber[]>([]);
  const [lastResult, setLastResult] = useState<CombatResult | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(initialAudioEnabled);
  const [onboardingStep, setOnboardingStep] = useState<number | null>(initialOnboardingStep);
  const [progress, setProgress] = useState<PlayerProgress>(initialProgress);
  const [campaignPickerOpen, setCampaignPickerOpen] = useState(false);
  const [reserveSelected, setReserveSelected] = useState(false);
  const animationId = useRef(1);
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
  const familyWeights = useMemo(() => getFamilyWeights(presentedBoard), [presentedBoard]);
  const power = useMemo(() => getPowerBreakdown(presentedBoard), [presentedBoard]);
  const mode: GreyboxMode =
    game.phase === "battle" || game.phase === "result" ||
    game.phase === "victory" || game.phase === "gameover"
      ? "arena"
      : "workshop";

  useEffect(() => {
    if (!audioEnabled) audioDirector.setEnabled(false);
    // The initial preference is applied once; later changes use the explicit toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        }, 950);
      }
    }, 45);
    return () => window.clearInterval(timer);
  }, [playback]);

  useEffect(() => {
    const event = combat?.event;
    if (!event || combat.eventIndex === lastAudioEvent.current) return;
    lastAudioEvent.current = combat.eventIndex;
    audioDirector.play(combatSound(event));
  }, [combat?.event, combat?.eventIndex]);

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
            audioDirector.play("merge");
            return { ...current, phase: "merge", mergeStepIndex: 0 };
          }
          return { ...current, phase: "reveal" };
        }
        if (current.phase === "merge") {
          if (current.mergeStepIndex + 1 < current.merges.length) {
            audioDirector.play("merge");
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
    const enabled = !audioEnabled;
    setAudioEnabled(enabled);
    audioDirector.setEnabled(enabled);
    try {
      window.localStorage.setItem(AUDIO_STORAGE_KEY, enabled ? "enabled" : "muted");
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
    audioDirector.play("purchase");
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
    audioDirector.play("purchase");
  }

  function handleStartBattle() {
    if (purchase) return;
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
    setGame(withResult);
    setLastResult(result);
    const speed: BattlePlaybackSpeed = game.round === 1 ? 1 : 2;
    setBattleSpeed(speed);
    setPlayback({
      result,
      timeline: createCombatTimeline(result.events),
      startedAt: performance.now(),
      offsetMs: 0,
      speed,
      paused: false,
    });
    setNotice(`Kessel an! ${opponentName(nextOpponent.id)} ist bereit.`);
    lastAudioEvent.current = -1;
    audioDirector.play("battleStart");
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
    setReserveSelected(false);
    setCampaignPickerOpen(false);
    setNotice("Neuer Lauf, neue Mischung. Wähle deine erste Zutat.");
    audioDirector.play("battleStart");
  }

  const selectedItem = game.selectedSlot === null ? null : (presentedBoard[game.selectedSlot] ?? null);
  const selectedInsights = game.selectedSlot === null || !selectedItem
    ? null
    : getItemPlacementInsights(presentedBoard, game.selectedSlot);
  const battleResult = game.pendingBattle ?? lastResult;
  const playerHp = combat?.playerHp ?? battleResult?.finalPlayerHp ?? 100;
  const enemyHp = combat?.enemyHp ?? battleResult?.finalEnemyHp ?? opponent.baseHp;
  const battleProgress = (combat?.playbackProgress ?? 0) * 100;

  return (
    <main className={`game-shell phase-${game.phase}`}>
      <SceneErrorBoundary>
        <Suspense fallback={<div className="scene-loading"><i /><span>Werkstatt wird angeheizt …</span></div>}>
          <GreyboxStage
            mode={mode}
            workshop={{
              board: presentedBoard,
              offers: game.offers,
              selectedSlot: game.selectedSlot,
              reserve: presentedReserve,
              reserveUnlocked: game.round >= 5,
              reserveSelected,
              purchase,
              onSelectSlot: handleSelectSlot,
              onSelectReserve: handleSelectReserve,
            }}
            arena={{
              board: game.board,
              opponent,
              combat,
              outcome: game.phase === "battle" && playback ? null : battleResult?.winner ?? null,
            }}
          />
        </Suspense>
      </SceneErrorBoundary>

      <header className="game-title" aria-live="polite">
        <p>KESSELKRAWALL 3D · RUNDE {game.round}</p>
        <h1>{mode === "workshop" ? "Hexenwerkbank" : opponentName(opponent.id)}</h1>
        <span>{mode === "workshop" ? notice : eventText(combat?.event ?? null)}</span>
      </header>

      <section className="run-stats" aria-label="Laufstatus">
        <div><span>Gold</span><strong>{game.gold}</strong></div>
        <div><span>Siegel</span><strong>{"◆".repeat(game.seals) || "–"}</strong></div>
        <div><span>Kraft</span><strong>{power.total}</strong></div>
      </section>

      <nav className="utility-controls" aria-label="Spieleinstellungen">
        <button
          aria-label={audioEnabled ? "Audio ausschalten" : "Audio einschalten"}
          aria-pressed={audioEnabled}
          onClick={handleAudioToggle}
          type="button"
        >
          {audioEnabled ? "♪" : "×"}
          <span>{audioEnabled ? "Ton" : "Stumm"}</span>
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

          <section className="board-controls" aria-label="Zutatenplätze">
            {presentedBoard.map((item, index) => (
              <button
                aria-label={item ? `Platz ${index + 1}: ${itemCopy(item.itemId).name}, Stufe ${item.level}` : `Platz ${index + 1}: leer`}
                aria-pressed={game.selectedSlot === index}
                className={game.selectedSlot === index ? "is-selected" : undefined}
                disabled={Boolean(purchase) || (!item && game.selectedSlot === null)}
                key={index}
                onClick={() => handleSelectSlot(index)}
                type="button"
              >
                <span>{item ? FAMILY_COPY[getItemDefinition(item.itemId).family].symbol : index + 1}</span>
                <small>{item ? ROMAN_LEVEL[item.level] : "leer"}</small>
              </button>
            ))}
            {game.round >= 5 && (
              <button
                aria-label={presentedReserve ? `Reserve: ${itemCopy(presentedReserve.itemId).name}, Stufe ${presentedReserve.level}` : "Reserve: leer"}
                aria-pressed={reserveSelected}
                className={reserveSelected ? "is-selected reserve-control" : "reserve-control"}
                disabled={Boolean(purchase)}
                onClick={handleSelectReserve}
                type="button"
              >
                <span>{presentedReserve ? FAMILY_COPY[getItemDefinition(presentedReserve.itemId).family].symbol : "R"}</span>
                <small>{presentedReserve ? ROMAN_LEVEL[presentedReserve.level] : "Reserve"}</small>
              </button>
            )}
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
                    <span className="offer-family">{FAMILY_COPY[definition.family].symbol}</span>
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

      {mode === "arena" && (
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
            <div><strong>{opponentName(opponent.id)}</strong><span>{enemyHp} +{combat?.enemyShield ?? 0}</span></div>
            <div className="health-track"><i style={{ width: hpPercent(enemyHp, battleResult?.enemyMaxHp ?? opponent.baseHp) }} /></div>
            <CombatStatusStrip
              elapsedMs={combat?.elapsedMs ?? 0}
              shield={combat?.enemyShield ?? 0}
              status={combat?.statuses.enemy ?? createEmptyCombatStatuses().enemy}
            />
          </div>
        </section>
      )}

      {mode === "arena" && <CombatNumberLayer numbers={floatingNumbers} />}

      {(game.phase === "result" || game.phase === "victory" || game.phase === "gameover") && battleResult && (
        <section className="result-panel" role="dialog" aria-modal="true" aria-label="Kampfergebnis">
          <p>{battleResult.winner === "player" ? "KESSEL-SIEG" : battleResult.winner === "enemy" ? "KESSEL GESTÜRZT" : "GLEICHSTAND"}</p>
          <h2>{battleResult.winner === "player" ? "Sauber gebraut!" : battleResult.winner === "enemy" ? "Noch einmal umrühren." : "Beide Kessel dampfen noch."}</h2>
          <div className="result-stats">
            <span>{Math.round(battleResult.duration / 100) / 10}s Kampf</span>
            <span>{battleResult.playerStats.reduce((sum, stat) => sum + stat.totalDamage, 0)} Schaden</span>
            <span>{getBattleReward(game, battleResult.winner)} Gold</span>
          </div>
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
