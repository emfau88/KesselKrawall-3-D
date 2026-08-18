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
  createCombatTimeline,
  getBeatAt,
  getPlaybackElapsedMs,
  getTimelineProgress,
  type BattlePlaybackSpeed,
  type CombatTimeline,
} from "./presentation/combat/combatPresentation";
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

export function App() {
  const [game, setGame] = useState<GameState>(initialGame);
  const [notice, setNotice] = useState("Wähle eine Zutat. Gleiche Zutaten verschmelzen automatisch.");
  const [purchase, setPurchase] = useState<PurchaseVisual | null>(null);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [battleSpeed, setBattleSpeed] = useState<BattlePlaybackSpeed>(1);
  const [combat, setCombat] = useState<CombatFrame | null>(null);
  const [lastResult, setLastResult] = useState<CombatResult | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(initialAudioEnabled);
  const [onboardingStep, setOnboardingStep] = useState<number | null>(initialOnboardingStep);
  const [progress, setProgress] = useState<PlayerProgress>(initialProgress);
  const [campaignPickerOpen, setCampaignPickerOpen] = useState(false);
  const [reserveSelected, setReserveSelected] = useState(false);
  const animationId = useRef(1);
  const lastAudioEvent = useRef(-1);
  const soundedResult = useRef<CombatResult | null>(null);
  const resultRevealTimer = useRef<number | null>(null);

  const opponent = useMemo(() => getCurrentOpponent(game), [game]);
  const familyWeights = useMemo(() => getFamilyWeights(game.board), [game.board]);
  const power = useMemo(() => getPowerBreakdown(game.board), [game.board]);
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
        eventIndex: beat?.eventIndex ?? -1,
        event,
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
          eventIndex: playback.result.events.length,
          event: playback.result.events.at(-1) ?? null,
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
    if (game.phase !== "result" || !game.pendingBattle || soundedResult.current === game.pendingBattle) return;
    soundedResult.current = game.pendingBattle;
    audioDirector.play(game.pendingBattle.winner === "player" ? "victory" : "defeat");
  }, [game.pendingBattle, game.phase]);

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
      audioDirector.play(merges.length > 0 ? "merge" : "purchase");
    }
  }

  function handleReroll() {
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
    const result = selectOrSwapSlot(game, slot);
    setGame(result.state);
    setReserveSelected(false);
    audioDirector.play("select");
    if (game.selectedSlot !== null && game.selectedSlot !== slot) {
      setNotice("Zutatenplätze getauscht. Nachbarschaftseffekte wurden neu berechnet.");
    } else if (game.board[slot]) {
      setNotice(`${itemCopy(game.board[slot]?.itemId ?? "").name} ausgewählt.`);
    }
  }

  function handleSelectReserve() {
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
    setCombat({
      eventIndex: -1,
      event: null,
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

  const selectedItem = game.selectedSlot === null ? null : (game.board[game.selectedSlot] ?? null);
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
              board: game.board,
              offers: game.offers,
              selectedSlot: game.selectedSlot,
              reserve: game.reserve,
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
            {game.board.map((item, index) => (
              <button
                aria-label={item ? `Platz ${index + 1}: ${itemCopy(item.itemId).name}, Stufe ${item.level}` : `Platz ${index + 1}: leer`}
                aria-pressed={game.selectedSlot === index}
                className={game.selectedSlot === index ? "is-selected" : undefined}
                disabled={!item && game.selectedSlot === null}
                key={index}
                onClick={() => handleSelectSlot(index)}
                type="button"
              >
                <span>{item ? FAMILY_COPY[getItemDefinition(item.itemId).family].symbol : index + 1}</span>
                <small>{item ? `L${item.level}` : "leer"}</small>
              </button>
            ))}
            {game.round >= 5 && (
              <button
                aria-label={game.reserve ? `Reserve: ${itemCopy(game.reserve.itemId).name}, Stufe ${game.reserve.level}` : "Reserve: leer"}
                aria-pressed={reserveSelected}
                className={reserveSelected ? "is-selected reserve-control" : "reserve-control"}
                onClick={handleSelectReserve}
                type="button"
              >
                <span>{game.reserve ? FAMILY_COPY[getItemDefinition(game.reserve.itemId).family].symbol : "R"}</span>
                <small>{game.reserve ? `L${game.reserve.level}` : "Reserve"}</small>
              </button>
            )}
          </section>

          {selectedItem && game.selectedSlot !== null && (
            <aside className="selection-popover">
              <span>Platz {game.selectedSlot + 1}</span>
              <strong>{itemCopy(selectedItem.itemId).name} · Stufe {selectedItem.level}</strong>
              <p>{itemCopy(selectedItem.itemId).short}</p>
              <button type="button" onClick={handleSellSelected}>
                Verkaufen · +{getSellValue(selectedItem)} Gold
              </button>
            </aside>
          )}

          {reserveSelected && game.reserve && (
            <aside className="selection-popover reserve-popover">
              <span>Reserve</span>
              <strong>{itemCopy(game.reserve.itemId).name} · Stufe {game.reserve.level}</strong>
              <p>Wähle einen Werkbankplatz zum Tauschen oder verkaufe die Reservezutat.</p>
              <button type="button" onClick={handleSellReserve}>
                Verkaufen · +{getSellValue(game.reserve)} Gold
              </button>
            </aside>
          )}

          <section className="shop-ribbon" aria-label="Zutatenladen">
            <div className="shop-heading">
              <span>Wanderladen</span>
              <button type="button" onClick={handleReroll}>
                Neu mischen · {game.rerollsUsed === 0 ? "gratis" : "1 Gold"}
              </button>
            </div>
            <div className="offers">
              {game.offers.map((offer) => {
                const definition = getItemDefinition(offer.itemId);
                const copy = itemCopy(offer.itemId);
                const preview = getPurchaseMergePreview(
                  game.board,
                  offer.itemId,
                  game.reserve,
                  game.round >= 5,
                );
                return (
                  <button
                    className={`offer family-${definition.family}`}
                    disabled={offer.bought}
                    key={offer.uid}
                    onClick={() => handleBuy(offer.uid)}
                    type="button"
                  >
                    <span className="offer-family">{FAMILY_COPY[definition.family].symbol}</span>
                    <span className="offer-copy">
                      <strong>{offer.bought ? "Verkauft" : copy.name}</strong>
                      <small>{preview ? `Verschmilzt → Stufe ${preview.resultLevel}` : copy.short}</small>
                    </span>
                    <span className="offer-cost">{definition.cost} ◉</span>
                  </button>
                );
              })}
            </div>
            <button className="mobile-reroll" type="button" onClick={handleReroll} aria-label="Angebote neu mischen">
              ↻<small>{game.rerollsUsed === 0 ? "gratis" : "1 Gold"}</small>
            </button>
            <button
              className="battle-button"
              disabled={!game.board.some(Boolean)}
              onClick={handleStartBattle}
              type="button"
            >
              Gegen {opponentName(opponent.id)}
              <small>Kampf starten</small>
            </button>
          </section>
        </>
      )}

      {mode === "arena" && (
        <section className="battle-hud" aria-label="Kampfstatus">
          <div className="combatant player-health">
            <div><strong>Dein Kessel</strong><span>{playerHp} +{combat?.playerShield ?? 0}</span></div>
            <div className="health-track"><i style={{ width: hpPercent(playerHp, battleResult?.playerMaxHp ?? 100) }} /></div>
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
          </div>
        </section>
      )}

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

      {mode === "workshop" && !selectedItem && game.board.some(Boolean) && (
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
