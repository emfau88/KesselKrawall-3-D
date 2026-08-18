import { getItemDefinition } from "../data";
import { getFamilyWeights, isSynergyActive } from "../state";
import type {
  BattleOutcome,
  BattleSimulationOptions,
  Board,
  BossRule,
  CombatEvent,
  CombatEventCode,
  CombatEventKind,
  CombatResult,
  Family,
  ItemCombatStats,
  ItemDefinition,
  ItemInstance,
  OpponentDefinition,
  Side,
} from "../types";

const PLAYER_MAX_HP = 100;
const STEP_MS = 100;

export const DEFAULT_COMBAT_LIMIT_MS = 30_000;
export const POISON_CAP = 12;
export const POISON_DECAY_PER_TICK = 2;
export const POISON_BURST_THRESHOLD = 10;
export const POISON_BURST_DAMAGE_MULTIPLIER = 1.5;
export const SHIELD_CAP_RATIO = 0.5;
export const KESSEL_HEAT_START_MS = 15_000;
export const KESSEL_HEAT_STEP_MS = 2_000;
export const KESSEL_HEAT_DAMAGE_PER_STEP = 0.05;
export const KESSEL_HEAT_MAX_MULTIPLIER = 1.25;
export const KESSEL_FINISHER_START_MS = 25_000;
export const KESSEL_FINISHER_STEP_MS = 2_000;
export const KESSEL_FINISHER_DAMAGE_PER_STEP = 0.15;
export const KESSEL_FINISHER_MAX_MULTIPLIER = 1.7;

interface RuntimeItem {
  instance: ItemInstance;
  slot: number;
  nextAt: number;
  cooldown: number;
  activations: number;
  emergencyUsed: boolean;
}
type MutableItemCombatStats = {
  -readonly [Key in keyof ItemCombatStats]: ItemCombatStats[Key];
};

interface Combatant {
  side: Side;
  hp: number;
  maxHp: number;
  shield: number;
  board: Board;
  poison: number;
  poisonSourceUid: string | null;
  burn: Map<string, number>;
  stats: Map<string, MutableItemCombatStats>;
  runtimes: RuntimeItem[];
  powerMultiplier: number;
  hpDamageDealt: number;
  familyActivationCount: Record<Family, number>;
}

interface World {
  time: number;
  player: Combatant;
  enemy: Combatant;
  events: CombatEvent[];
  bossRuleTriggered: boolean;
  bossRule: BossRule | undefined;
  kesselHeatEnabled: boolean;
}

function roundAmount(value: number): number {
  return Math.max(0, Math.round(value));
}

export function getKesselHeatDamageMultiplier(timeMs: number): number {
  if (timeMs < KESSEL_HEAT_START_MS) return 1;
  const steps =
    Math.floor((timeMs - KESSEL_HEAT_START_MS) / KESSEL_HEAT_STEP_MS) + 1;
  const heatMultiplier = Math.min(
    KESSEL_HEAT_MAX_MULTIPLIER,
    1 + steps * KESSEL_HEAT_DAMAGE_PER_STEP,
  );
  if (timeMs < KESSEL_FINISHER_START_MS) return heatMultiplier;
  const finisherSteps =
    Math.floor(
      (timeMs - KESSEL_FINISHER_START_MS) / KESSEL_FINISHER_STEP_MS,
    ) + 1;
  return Math.min(
    KESSEL_FINISHER_MAX_MULTIPLIER,
    heatMultiplier + finisherSteps * KESSEL_FINISHER_DAMAGE_PER_STEP,
  );
}

function opponentOf(world: World, side: Side): Combatant {
  return side === "player" ? world.enemy : world.player;
}

function statFor(
  combatant: Combatant,
  uid: string,
): MutableItemCombatStats {
  const existing = combatant.stats.get(uid);
  if (existing) return existing;
  const instance = combatant.board.find((item) => item?.uid === uid);
  const created: MutableItemCombatStats = {
    uid,
    itemId: instance?.itemId ?? "status",
    level: instance?.level ?? 1,
    triggers: 0,
    hpDamage: 0,
    shieldDamage: 0,
    totalDamage: 0,
    healing: 0,
    shield: 0,
    poisonApplied: 0,
  };
  combatant.stats.set(uid, created);
  return created;
}

function itemForSource(
  combatant: Combatant,
  sourceUid: string,
): ItemInstance | undefined {
  return combatant.board.find((item) => item?.uid === sourceUid) ?? undefined;
}

function pushEvent(
  world: World,
  input: {
    kind: CombatEventKind;
    code: CombatEventCode;
    actor: Side;
    target: Side;
    sourceUid: string;
    amount: number;
    family?: Family;
    bossRule?: BossRule;
  },
): void {
  const actor = input.actor === "player" ? world.player : world.enemy;
  const sourceItem = itemForSource(actor, input.sourceUid);
  world.events.push({
    time: world.time,
    kind: input.kind,
    code: input.code,
    actor: input.actor,
    target: input.target,
    sourceUid: input.sourceUid,
    ...(sourceItem ? { sourceItemId: sourceItem.itemId } : {}),
    ...(input.family ? { family: input.family } : {}),
    ...(input.bossRule ? { bossRule: input.bossRule } : {}),
    amount: input.amount,
    playerHp: roundAmount(world.player.hp),
    playerShield: roundAmount(world.player.shield),
    enemyHp: roundAmount(world.enemy.hp),
    enemyShield: roundAmount(world.enemy.shield),
  });
}

function applyDamage(
  world: World,
  actor: Combatant,
  target: Combatant,
  sourceUid: string,
  rawAmount: number,
  kind: "damage" | "poison" | "poisonBurst" | "burn" = "damage",
  code: CombatEventCode = "item.damage",
): number {
  const heatMultiplier = world.kesselHeatEnabled
    ? getKesselHeatDamageMultiplier(world.time)
    : 1;
  const amount = roundAmount(rawAmount * heatMultiplier);
  if (amount <= 0) return 0;
  const absorbed = Math.min(target.shield, amount);
  target.shield -= absorbed;
  const hpDamage = Math.min(target.hp, amount - absorbed);
  target.hp -= hpDamage;
  const applied = absorbed + hpDamage;
  if (applied <= 0) return 0;
  const stats = statFor(actor, sourceUid);
  stats.hpDamage += hpDamage;
  stats.shieldDamage += absorbed;
  stats.totalDamage += applied;
  actor.hpDamageDealt += hpDamage;
  pushEvent(world, {
    kind,
    code,
    actor: actor.side,
    target: target.side,
    sourceUid,
    amount: applied,
  });
  if (target.hp > 0) {
    triggerDamageReactions(world, target, actor, absorbed > 0 || hpDamage > 0);
  }
  return applied;
}

function applyShield(
  world: World,
  actor: Combatant,
  sourceUid: string,
  rawAmount: number,
): number {
  const amount = roundAmount(rawAmount);
  if (amount <= 0 || actor.hp <= 0) return 0;
  const shieldCap = Math.round(actor.maxHp * SHIELD_CAP_RATIO);
  const gained = Math.min(amount, Math.max(0, shieldCap - actor.shield));
  if (gained <= 0) return 0;
  actor.shield += gained;
  statFor(actor, sourceUid).shield += gained;
  pushEvent(world, {
    kind: "shield",
    code: "item.shield",
    actor: actor.side,
    target: actor.side,
    sourceUid,
    amount: gained,
  });
  return gained;
}

function applyHeal(
  world: World,
  actor: Combatant,
  sourceUid: string,
  rawAmount: number,
  overhealToShield: boolean,
): void {
  if (actor.hp <= 0) return;
  const amount = roundAmount(rawAmount);
  if (amount <= 0) return;
  const missing = actor.maxHp - actor.hp;
  const healed = Math.min(missing, amount);
  const overheal = amount - healed;
  actor.hp += healed;
  statFor(actor, sourceUid).healing += healed;
  if (healed > 0) {
    pushEvent(world, {
      kind: "heal",
      code: "item.heal",
      actor: actor.side,
      target: actor.side,
      sourceUid,
      amount: healed,
    });
  }
  if (overhealToShield && overheal > 0) {
    applyShield(world, actor, sourceUid, overheal);
  }
}

function familyPowerMultiplier(
  combatant: Combatant,
  slot: number,
  definition: ItemDefinition,
): number {
  let multiplier = 1;
  for (const neighborSlot of [slot - 1, slot + 1]) {
    const neighbor = combatant.board[neighborSlot];
    if (!neighbor) continue;
    const neighborDefinition = getItemDefinition(neighbor.itemId);
    if (
      neighborDefinition.passive?.type === "powerAdjacent" &&
      (!neighborDefinition.passive.family ||
        neighborDefinition.passive.family === definition.family)
    ) {
      const value = neighborDefinition.passive.values[neighbor.level - 1];
      if (value !== undefined) multiplier *= 1 + value;
    }
  }
  return multiplier;
}

function cooldownMultiplier(
  board: Board,
  slot: number,
  definition: ItemDefinition,
): number {
  let multiplier = 1;
  for (let sourceSlot = 0; sourceSlot < board.length; sourceSlot += 1) {
    const source = board[sourceSlot];
    if (!source) continue;
    const passive = getItemDefinition(source.itemId).passive;
    if (!passive) continue;
    const value = passive.values[source.level - 1];
    if (value === undefined) continue;
    if (
      passive.type === "hasteAdjacent" &&
      Math.abs(sourceSlot - slot) === 1 &&
      (!passive.family || passive.family === definition.family)
    ) {
      multiplier *= 1 - value;
    }
    if (
      passive.type === "hasteFamily" &&
      (!passive.family || passive.family === definition.family)
    ) {
      multiplier *= 1 - value;
    }
  }
  if (definition.family === "poison" && isSynergyActive(board, "poison")) {
    multiplier *= 0.95;
  }
  return Math.max(0.45, multiplier);
}

export function getItemCooldownMs(board: Board, slot: number): number {
  const instance = board[slot];
  if (!instance) return 0;
  const definition = getItemDefinition(instance.itemId);
  const cooldown = definition.cooldown[instance.level - 1];
  if (cooldown === undefined) throw new Error("Item cooldown level is missing.");
  return cooldown * cooldownMultiplier(board, slot, definition) * 1_000;
}

function createCombatant(side: Side, board: Board, maxHp: number): Combatant {
  const stats = new Map<string, MutableItemCombatStats>();
  const runtimes: RuntimeItem[] = [];
  board.forEach((instance, slot) => {
    if (!instance) return;
    stats.set(instance.uid, {
      uid: instance.uid,
      itemId: instance.itemId,
      level: instance.level,
      triggers: 0,
      hpDamage: 0,
      shieldDamage: 0,
      totalDamage: 0,
      healing: 0,
      shield: 0,
      poisonApplied: 0,
    });
    const cooldown = getItemCooldownMs(board, slot);
    const trigger = getItemDefinition(instance.itemId).trigger;
    runtimes.push({
      instance,
      slot,
      cooldown,
      nextAt:
        trigger?.type === "onGuardedHit"
          ? 0
          : trigger?.type === "emergency"
            ? Number.POSITIVE_INFINITY
            : Math.round(cooldown / STEP_MS) * STEP_MS,
      activations: 0,
      emergencyUsed: false,
    });
  });
  return {
    side,
    hp: maxHp,
    maxHp,
    shield: 0,
    board,
    poison: 0,
    poisonSourceUid: null,
    burn: new Map(),
    stats,
    runtimes,
    powerMultiplier: 1,
    hpDamageDealt: 0,
    familyActivationCount: {
      fire: 0,
      poison: 0,
      guard: 0,
      frost: 0,
      echo: 0,
    },
  };
}

function directDamageMultiplier(combatant: Combatant): number {
  return isSynergyActive(combatant.board, "fire") ? 1.22 : 1;
}

function guardMultiplier(combatant: Combatant): number {
  return isSynergyActive(combatant.board, "guard") ? 1.15 : 1;
}

function clearPoison(
  world: World,
  actor: Combatant,
  sourceUid: string,
): void {
  const cleared = actor.poison;
  if (cleared <= 0) return;
  actor.poison = 0;
  actor.poisonSourceUid = null;
  pushEvent(world, {
    kind: "cleanse",
    code: "status.poisonCleansed",
    actor: actor.side,
    target: actor.side,
    sourceUid,
    amount: cleared,
  });
}

function addPoison(
  world: World,
  actor: Combatant,
  target: Combatant,
  sourceUid: string,
  rawStacks: number,
): void {
  if (target.hp <= 0) return;
  const synergyBonus = isSynergyActive(actor.board, "poison") ? 1 : 0;
  const requestedStacks = roundAmount(rawStacks + synergyBonus);
  const stacks = Math.min(requestedStacks, POISON_CAP - target.poison);
  if (stacks <= 0) return;
  target.poison += stacks;
  target.poisonSourceUid = sourceUid;
  statFor(actor, sourceUid).poisonApplied += stacks;
  pushEvent(world, {
    kind: "poison",
    code: "item.poison",
    actor: actor.side,
    target: target.side,
    sourceUid,
    amount: stacks,
  });

  if (target.poison >= POISON_BURST_THRESHOLD) {
    const consumed = target.poison;
    target.poison = 0;
    target.poisonSourceUid = null;
    applyDamage(
      world,
      actor,
      target,
      sourceUid,
      consumed * POISON_BURST_DAMAGE_MULTIPLIER,
      "poisonBurst",
      "status.poisonBurst",
    );
  }
}

function addBurn(
  world: World,
  actor: Combatant,
  target: Combatant,
  sourceUid: string,
  stacks: number,
): void {
  if (target.hp <= 0) return;
  target.burn.set(sourceUid, (target.burn.get(sourceUid) ?? 0) + stacks);
  pushEvent(world, {
    kind: "burn",
    code: "status.burnApplied",
    actor: actor.side,
    target: target.side,
    sourceUid,
    amount: stacks,
  });
}

function activateItem(
  world: World,
  actor: Combatant,
  target: Combatant,
  runtime: RuntimeItem,
  effectMultiplier = 1,
  isEcho = false,
): void {
  const { instance, slot } = runtime;
  const definition = getItemDefinition(instance.itemId);
  const index = (instance.level - 1) as 0 | 1 | 2;
  const stats = statFor(actor, instance.uid);
  stats.triggers += 1;
  const activationIndex = runtime.activations;
  if (!isEcho) runtime.activations += 1;
  const placementPower = familyPowerMultiplier(actor, slot, definition);
  const directMultiplier = directDamageMultiplier(actor) * placementPower;
  const defensiveMultiplier = guardMultiplier(actor) * placementPower;
  const rampMultiplier =
    definition.trigger?.type === "ramp"
      ? 1 + activationIndex * definition.trigger.growthPerActivation
      : 1;
  let primary =
    definition.values[index] *
    actor.powerMultiplier *
    effectMultiplier *
    rampMultiplier;
  const secondary =
    (definition.secondaryValues?.[index] ?? 0) *
    actor.powerMultiplier *
    effectMultiplier *
    rampMultiplier;

  if (definition.scalesWithFamily) {
    const weight = getFamilyWeights(actor.board)[definition.scalesWithFamily];
    primary *= 1 + Math.max(0, weight - 1) * 0.12;
  }

  switch (definition.effect) {
    case "damage":
      applyDamage(
        world,
        actor,
        target,
        instance.uid,
        primary * directMultiplier,
      );
      break;
    case "poison":
      addPoison(world, actor, target, instance.uid, primary);
      break;
    case "shield":
      applyShield(
        world,
        actor,
        instance.uid,
        primary * defensiveMultiplier,
      );
      break;
    case "heal":
      applyHeal(
        world,
        actor,
        instance.uid,
        primary * defensiveMultiplier,
        definition.levelThreeBonus === "overhealShield" && instance.level === 3,
      );
      break;
    case "hybrid":
      applyHeal(
        world,
        actor,
        instance.uid,
        primary * defensiveMultiplier,
        false,
      );
      applyShield(
        world,
        actor,
        instance.uid,
        secondary * defensiveMultiplier,
      );
      break;
    case "conditionalDamage":
      applyDamage(
        world,
        actor,
        target,
        instance.uid,
        (primary + (target.poison > 0 ? secondary : 0)) * directMultiplier,
      );
      break;
    case "poisonDamage":
      applyDamage(
        world,
        actor,
        target,
        instance.uid,
        primary * directMultiplier,
      );
      addPoison(world, actor, target, instance.uid, secondary);
      break;
    case "shieldDamage":
      applyShield(
        world,
        actor,
        instance.uid,
        primary * defensiveMultiplier,
      );
      applyDamage(
        world,
        actor,
        target,
        instance.uid,
        secondary * directMultiplier,
      );
      break;
  }

  if (definition.levelThreeBonus === "burn" && instance.level === 3) {
    addBurn(world, actor, target, instance.uid, 3);
  }
  if (
    definition.levelThreeBonus === "cleansePoison" &&
    instance.level === 3
  ) {
    clearPoison(world, actor, instance.uid);
  }

  if (isEcho || actor.hp <= 0 || target.hp <= 0) return;
  if (definition.family === "frost" && isSynergyActive(actor.board, "frost")) {
    actor.familyActivationCount.frost += 1;
    if (actor.familyActivationCount.frost % 3 === 0) {
      for (const targetRuntime of target.runtimes) {
        const targetTrigger = getItemDefinition(
          targetRuntime.instance.itemId,
        ).trigger;
        if (
          targetTrigger?.type !== "onGuardedHit" &&
          targetTrigger?.type !== "emergency"
        ) {
          targetRuntime.nextAt += 650;
        }
      }
      pushEvent(world, {
        kind: "frost",
        code: "synergy.frostDelay",
        actor: actor.side,
        target: target.side,
        sourceUid: instance.uid,
        family: "frost",
        amount: 650,
      });
    }
  }
  if (definition.family === "echo" && isSynergyActive(actor.board, "echo")) {
    actor.familyActivationCount.echo += 1;
    if (actor.familyActivationCount.echo % 3 === 0) {
      pushEvent(world, {
        kind: "echo",
        code: "synergy.echoRepeat",
        actor: actor.side,
        target: actor.side,
        sourceUid: instance.uid,
        family: "echo",
        amount: 55,
      });
      activateItem(world, actor, target, runtime, effectMultiplier * 0.55, true);
    }
  }
}

function triggerDamageReactions(
  world: World,
  actor: Combatant,
  target: Combatant,
  tookDamage: boolean,
): void {
  for (const runtime of actor.runtimes) {
    const trigger = getItemDefinition(runtime.instance.itemId).trigger;
    if (!trigger || actor.hp <= 0) continue;
    if (
      trigger.type === "emergency" &&
      !runtime.emergencyUsed &&
      actor.hp / actor.maxHp <= trigger.threshold
    ) {
      runtime.emergencyUsed = true;
      activateItem(world, actor, target, runtime, trigger.multiplier);
      continue;
    }
    if (
      trigger.type === "onGuardedHit" &&
      tookDamage &&
      runtime.nextAt <= world.time
    ) {
      runtime.nextAt =
        world.time + Math.round(runtime.cooldown / STEP_MS) * STEP_MS;
      activateItem(world, actor, target, runtime);
    }
  }
}

function tickBurn(world: World, afflicted: Combatant): void {
  const attacker = opponentOf(world, afflicted.side);
  for (const [sourceUid, stacks] of [...afflicted.burn.entries()]) {
    if (stacks <= 0) {
      afflicted.burn.delete(sourceUid);
      continue;
    }
    applyDamage(
      world,
      attacker,
      afflicted,
      sourceUid,
      stacks,
      "burn",
      "status.burnTick",
    );
    const remaining = stacks - 1;
    if (remaining <= 0) afflicted.burn.delete(sourceUid);
    else afflicted.burn.set(sourceUid, remaining);
  }
}

function tickPoison(world: World, afflicted: Combatant): void {
  if (afflicted.poison <= 0) return;
  const attacker = opponentOf(world, afflicted.side);
  const sourceUid =
    afflicted.poisonSourceUid ?? `${attacker.side}-shared-poison`;
  const damage = Math.ceil(afflicted.poison / 2);
  applyDamage(
    world,
    attacker,
    afflicted,
    sourceUid,
    damage,
    "poison",
    "status.poisonTick",
  );
  afflicted.poison = Math.max(0, afflicted.poison - POISON_DECAY_PER_TICK);
  if (afflicted.poison === 0) afflicted.poisonSourceUid = null;
}

function addStartingSynergyShield(world: World, combatant: Combatant): void {
  if (!isSynergyActive(combatant.board, "guard")) return;
  const shieldCap = Math.round(combatant.maxHp * SHIELD_CAP_RATIO);
  const gained = Math.min(12, shieldCap);
  combatant.shield = gained;
  pushEvent(world, {
    kind: "synergy",
    code: "synergy.guardStart",
    actor: combatant.side,
    target: combatant.side,
    sourceUid: `${combatant.side}-guard-synergy`,
    family: "guard",
    amount: gained,
  });
}

function finalWinner(world: World): BattleOutcome {
  if (world.player.hp <= 0 && world.enemy.hp > 0) return "enemy";
  if (world.enemy.hp <= 0 && world.player.hp > 0) return "player";
  if (world.player.hp <= 0 && world.enemy.hp <= 0) return "draw";
  const playerRatio = world.player.hp / world.player.maxHp;
  const enemyRatio = world.enemy.hp / world.enemy.maxHp;
  if (playerRatio > enemyRatio) return "player";
  if (enemyRatio > playerRatio) return "enemy";
  if (world.player.hpDamageDealt > world.enemy.hpDamageDealt) return "player";
  if (world.enemy.hpDamageDealt > world.player.hpDamageDealt) return "enemy";
  return "draw";
}

function triggerBossRule(world: World): void {
  if (
    !world.bossRule ||
    world.bossRuleTriggered ||
    world.enemy.hp <= 0 ||
    world.enemy.hp > world.enemy.maxHp / 2
  ) {
    return;
  }
  world.bossRuleTriggered = true;
  if (world.bossRule === "rageAtHalf") {
    world.enemy.powerMultiplier = 1.25;
    pushEvent(world, {
      kind: "boss",
      code: "boss.rage",
      actor: "enemy",
      target: "enemy",
      sourceUid: "boss-rage",
      bossRule: world.bossRule,
      amount: 25,
    });
    return;
  }

  world.enemy.powerMultiplier = 1.15;
  for (const runtime of world.player.runtimes) {
    const trigger = getItemDefinition(runtime.instance.itemId).trigger;
    if (trigger?.type !== "onGuardedHit" && trigger?.type !== "emergency") {
      runtime.nextAt += 900;
    }
  }
  pushEvent(world, {
    kind: "boss",
    code: "boss.timeFracture",
    actor: "enemy",
    target: "player",
    sourceUid: "boss-time-fracture",
    bossRule: world.bossRule,
    amount: 15,
  });
}

export function simulateBattle(
  playerBoard: Board,
  opponent: OpponentDefinition,
  options: BattleSimulationOptions = {},
): CombatResult {
  const combatLimitMs = Math.max(
    STEP_MS,
    Math.floor((options.combatLimitMs ?? DEFAULT_COMBAT_LIMIT_MS) / STEP_MS) *
      STEP_MS,
  );
  const world: World = {
    time: 0,
    player: createCombatant("player", playerBoard, PLAYER_MAX_HP),
    enemy: createCombatant("enemy", opponent.board, opponent.baseHp),
    events: [],
    bossRuleTriggered: false,
    bossRule: opponent.bossRule,
    kesselHeatEnabled: options.enableKesselHeat ?? true,
  };
  addStartingSynergyShield(world, world.player);
  addStartingSynergyShield(world, world.enemy);

  let reason: "knockout" | "timeout" = "timeout";
  for (let time = STEP_MS; time <= combatLimitMs; time += STEP_MS) {
    world.time = time;
    const playerAliveAtStart = world.player.hp > 0;
    const enemyAliveAtStart = world.enemy.hp > 0;

    if (time % 1_000 === 0) {
      if (playerAliveAtStart) tickBurn(world, world.player);
      if (enemyAliveAtStart) tickBurn(world, world.enemy);
    }
    if (time % 2_000 === 0) {
      if (playerAliveAtStart) tickPoison(world, world.player);
      if (enemyAliveAtStart) tickPoison(world, world.enemy);
    }
    if (world.player.hp <= 0 || world.enemy.hp <= 0) {
      reason = "knockout";
      break;
    }

    triggerBossRule(world);

    const actions: Array<{
      actor: Combatant;
      target: Combatant;
      item: RuntimeItem;
    }> = [];
    if (playerAliveAtStart) {
      for (const item of world.player.runtimes) {
        const trigger = getItemDefinition(item.instance.itemId).trigger;
        if (
          trigger?.type !== "onGuardedHit" &&
          trigger?.type !== "emergency" &&
          item.nextAt <= time
        ) {
          actions.push({ actor: world.player, target: world.enemy, item });
          item.nextAt += Math.round(item.cooldown / STEP_MS) * STEP_MS;
        }
      }
    }
    if (enemyAliveAtStart) {
      for (const item of world.enemy.runtimes) {
        const trigger = getItemDefinition(item.instance.itemId).trigger;
        if (
          trigger?.type !== "onGuardedHit" &&
          trigger?.type !== "emergency" &&
          item.nextAt <= time
        ) {
          actions.push({ actor: world.enemy, target: world.player, item });
          item.nextAt += Math.round(item.cooldown / STEP_MS) * STEP_MS;
        }
      }
    }
    for (const action of actions) {
      activateItem(world, action.actor, action.target, action.item);
    }
    if (world.player.hp <= 0 || world.enemy.hp <= 0) {
      reason = "knockout";
      break;
    }
  }

  return {
    winner: finalWinner(world),
    reason,
    duration: world.time,
    events: world.events,
    playerStats: [...world.player.stats.values()],
    enemyStats: [...world.enemy.stats.values()],
    finalPlayerHp: roundAmount(world.player.hp),
    finalPlayerShield: roundAmount(world.player.shield),
    finalEnemyHp: roundAmount(world.enemy.hp),
    finalEnemyShield: roundAmount(world.enemy.shield),
    playerMaxHp: world.player.maxHp,
    enemyMaxHp: world.enemy.maxHp,
  };
}
