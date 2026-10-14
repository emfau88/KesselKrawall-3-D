import type { Board } from "../../core/types";
import { assetBakeoffMode, type AssetBakeoffMode } from "./assetBakeoff";
import { productionAssetUrl, type ProductionAssetId } from "./ProductionAsset";
import { brasskinAssetId, characterAssetId } from "./character/brasskinAssets";
import { getRuntimeQualityProfile, type RuntimeQualityProfile } from "./runtimeQuality";
import { mockupAssetId } from "./mockupAssetIds";
import { isMockupCompositionEnabled } from "./compositionMode";

export interface AssetLoadProgress {
  readonly completed: number;
  readonly total: number;
  readonly percent: number;
  readonly currentAsset: ProductionAssetId | null;
}

const warmedAssets = new Map<ProductionAssetId, Promise<void>>();

const HERO_INGREDIENTS: Readonly<Record<string, ProductionAssetId>> = {
  chili: "ingredient-chili",
  "slime-shroom": "ingredient-slime-shroom",
  "rune-shell": "ingredient-rune-shell",
};

function uniqueAssets(assets: readonly ProductionAssetId[]): ProductionAssetId[] {
  return [...new Set(assets)];
}

export function getBattleCriticalAssetIds(
  playerBoard: Board,
  enemyBoard: Board,
  opponentId: string,
  mode: AssetBakeoffMode = assetBakeoffMode(),
  qualityTier: RuntimeQualityProfile["tier"] = getRuntimeQualityProfile().tier,
): ProductionAssetId[] {
  const assets: ProductionAssetId[] = [mode === "mockup" ? mockupAssetId("ritual-platform", qualityTier) : "hero-arena-dais", brasskinAssetId(qualityTier)];
  const authoredOpponent = opponentId === "zischbert" || opponentId === "moor-martha";
  if (authoredOpponent) assets.push(characterAssetId(opponentId, qualityTier));

  if (mode === "mockup") {
    // The recessed passage reuses the bench's wood atlas. Include that dependency
    // even if combat is entered without a previously cached workshop scene.
    if (isMockupCompositionEnabled()) assets.push(mockupAssetId("witch-workbench", qualityTier));
    assets.push(
      ...(["dungeon-wall-module", "dungeon-stone-arch", "alchemy-shelf", "dungeon-stone-pillar", "wall-candle-sconce", "triple-candleholder", "open-grimoire", "dungeon-floor-module"] as const)
        .map((slug) => mockupAssetId(slug, qualityTier)),
    );
    if (!authoredOpponent) assets.push("quaternius-cauldron-base");
  } else if (mode === "legacy") {
    assets.push(
      "dungeon-wall",
      "dungeon-wall-arched",
      "dungeon-floor-tile",
    );
  } else {
    assets.push(
      "quaternius-wall-brick",
      "quaternius-door-frame",
      "quaternius-floor-brick",
      "quaternius-torch",
    );
    if (!authoredOpponent) assets.push("quaternius-cauldron-base");
  }

  for (const item of [...playerBoard, ...enemyBoard]) {
    if (!item) continue;
    const asset = HERO_INGREDIENTS[item.itemId];
    if (asset) assets.push(asset);
  }

  return uniqueAssets(assets);
}

function resolveDependency(assetUrl: string, dependency: string): string {
  return new URL(dependency, new URL(assetUrl, document.baseURI)).href;
}

async function fetchRequired(url: string): Promise<Response> {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response;
}

async function warmAssetBundle(asset: ProductionAssetId): Promise<void> {
  const url = productionAssetUrl(asset);
  const response = await fetchRequired(url);
  if (!url.toLowerCase().endsWith(".gltf")) {
    await response.arrayBuffer();
    return;
  }

  const gltf = await response.json() as {
    buffers?: Array<{ uri?: string }>;
    images?: Array<{ uri?: string }>;
  };
  const dependencies = [
    ...(gltf.buffers ?? []).flatMap((entry) => entry.uri ? [entry.uri] : []),
    ...(gltf.images ?? []).flatMap((entry) => entry.uri ? [entry.uri] : []),
  ].filter((uri) => !uri.startsWith("data:"));
  await Promise.all(dependencies.map(async (dependency) => {
    const dependencyResponse = await fetchRequired(resolveDependency(url, dependency));
    await dependencyResponse.arrayBuffer();
  }));
}

export function warmProductionAsset(asset: ProductionAssetId): Promise<void> {
  const existing = warmedAssets.get(asset);
  if (existing) return existing;
  const promise = warmAssetBundle(asset).catch((error: unknown) => {
    warmedAssets.delete(asset);
    throw error;
  });
  warmedAssets.set(asset, promise);
  return promise;
}

export async function preloadBattleAssets(
  playerBoard: Board,
  enemyBoard: Board,
  opponentId: string,
  onProgress?: (progress: AssetLoadProgress) => void,
): Promise<readonly ProductionAssetId[]> {
  const assets = getBattleCriticalAssetIds(playerBoard, enemyBoard, opponentId);
  let completed = 0;
  const report = (currentAsset: ProductionAssetId | null) => {
    onProgress?.({
      completed,
      total: assets.length,
      percent: assets.length === 0 ? 100 : Math.round((completed / assets.length) * 100),
      currentAsset,
    });
  };
  report(null);

  const failures: ProductionAssetId[] = [];
  await Promise.all(assets.map(async (asset) => {
    try {
      await warmProductionAsset(asset);
    } catch {
      failures.push(asset);
    } finally {
      completed += 1;
      report(asset);
    }
  }));

  if (failures.length > 0) {
    throw new Error(`Kritische 3D-Assets konnten nicht geladen werden: ${failures.join(", ")}`);
  }
  return assets;
}

