export type SharedAssetId = 'workbench' | 'player-cauldron' | 'chili' | 'slime-shroom' | 'rune-shell';

export type SharedAssetDefinition = {
    readonly file: string;
    readonly label: string;
    readonly bytes: number;
    readonly bounds: {
        readonly min: readonly [number, number, number];
        readonly max: readonly [number, number, number];
    };
};

export const SHARED_ASSETS: Readonly<Record<SharedAssetId, SharedAssetDefinition>> = Object.freeze({
    workbench: {
        file: 'hero-workbench.glb',
        label: 'Hero-Werkbank',
        bytes: 640696,
        bounds: { min: [-4.22, -2.2, -3.34], max: [4.22, 0.535, 3.2] }
    },
    'player-cauldron': {
        file: 'hero-cauldron-player.glb',
        label: 'Spieler-Kessel',
        bytes: 752024,
        bounds: { min: [-1.255, -1.17, -1.428], max: [1.255, 0.91, 1.17] }
    },
    chili: {
        file: 'ingredient-chili.glb',
        label: 'Glut-Chili II',
        bytes: 109644,
        bounds: { min: [-0.426, -0.633, -0.168], max: [0.52, 0.927, 0.16] }
    },
    'slime-shroom': {
        file: 'ingredient-slime-shroom.glb',
        label: 'Schleimpilz II',
        bytes: 175140,
        bounds: { min: [-0.62, -0.59, -0.58], max: [0.62, 0.6, 0.58] }
    },
    'rune-shell': {
        file: 'ingredient-rune-shell.glb',
        label: 'Runenschale II',
        bytes: 98244,
        bounds: { min: [-0.54, -0.58, -0.62], max: [0.54, 0.591, 0.532] }
    }
});

export const SHARED_ASSET_IDS = Object.freeze(Object.keys(SHARED_ASSETS) as SharedAssetId[]);

export function sharedAssetUrl(id: SharedAssetId): string {
    const assetPath = `assets/hero/${SHARED_ASSETS[id].file}`;

    if (import.meta.env.DEV) {
        return `${import.meta.env.BASE_URL}${assetPath}`;
    }

    return new URL(`../${assetPath}`, new URL(import.meta.env.BASE_URL, window.location.href)).toString();
}
