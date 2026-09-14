import type { SharedAssetId } from '../assets/sharedAssets';

export type Vec3 = readonly [number, number, number];

export type AssetPlacement = {
    readonly asset: SharedAssetId;
    readonly position: Vec3;
    readonly rotation?: Vec3;
    readonly scale?: Vec3;
};

export type IngredientSlot = {
    readonly index: number;
    readonly position: Vec3;
    readonly ingredient?: SharedAssetId;
};

export const TABLE_SURFACE_Y = 2.735;

export const WORKSHOP_LAYOUT = Object.freeze({
    workbench: {
        asset: 'workbench',
        position: [0, 2.2, 0]
    } satisfies AssetPlacement,
    cauldron: {
        asset: 'player-cauldron',
        position: [0, 3.964, -0.3],
        rotation: [0, 180, 0],
        scale: [1.05, 1.05, 1.05]
    } satisfies AssetPlacement,
    slots: [
        { index: 0, position: [-2.75, TABLE_SURFACE_Y, 1.45], ingredient: 'chili' },
        { index: 1, position: [-1.48, TABLE_SURFACE_Y, 2.28], ingredient: 'slime-shroom' },
        { index: 2, position: [0, TABLE_SURFACE_Y, 2.62], ingredient: 'rune-shell' },
        { index: 3, position: [1.48, TABLE_SURFACE_Y, 2.28] },
        { index: 4, position: [2.75, TABLE_SURFACE_Y, 1.45] }
    ] satisfies readonly IngredientSlot[],
    camera: {
        position: [0, 7.1, 13.4] as Vec3,
        rotation: [-20, 0, 0] as Vec3,
        fov: 39
    }
});

export function ingredientPlacement(slot: IngredientSlot): AssetPlacement | null {
    if (!slot.ingredient) return null;

    const scale = 1.04;
    const baseOffset = slot.ingredient === 'chili' ? 0.633 : slot.ingredient === 'slime-shroom' ? 0.59 : 0.58;
    return {
        asset: slot.ingredient,
        position: [slot.position[0], slot.position[1] + baseOffset * scale, slot.position[2]],
        rotation: slot.ingredient === 'chili' ? [0, -24, -8] : [0, slot.index * 12 - 12, 0],
        scale: [scale, scale, scale]
    };
}
