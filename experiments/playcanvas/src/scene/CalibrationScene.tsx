import { Entity } from '@playcanvas/react';
import { Light, Render } from '@playcanvas/react/components';
import { Color, StandardMaterial } from 'playcanvas';

import type { SharedAssetId } from '../assets/sharedAssets';
import type { ResolvedCameraProfile } from '../camera/cameraProfiles';
import { ResponsiveCamera } from '../camera/ResponsiveCamera';

import { ingredientPlacement, WORKSHOP_LAYOUT } from './layout';
import { SharedModel } from './SharedModel';
import type { AssetLoadState } from './SharedModel';

const slotMaterial = new StandardMaterial();
slotMaterial.diffuse = new Color(0.13, 0.1, 0.14);
slotMaterial.emissive = new Color(0.09, 0.025, 0.12);
slotMaterial.metalness = 0.28;
slotMaterial.gloss = 0.38;
slotMaterial.update();

type CalibrationSceneProps = {
    cameraProfile: ResolvedCameraProfile;
    onAssetStateChange: (asset: SharedAssetId, state: AssetLoadState, error?: string) => void;
};

export function CalibrationScene({ cameraProfile, onAssetStateChange }: CalibrationSceneProps) {
    return (
        <>
            <ResponsiveCamera profile={cameraProfile} />

            <Entity name="key-light" rotation={[42, 32, 0]}>
                <Light
                    color="#ffd0a0"
                    intensity={1.35}
                    type="directional"
                    castShadows
                    shadowDistance={24}
                    shadowResolution={2048}
                />
            </Entity>
            <Entity name="fill-light" rotation={[20, -145, 0]}>
                <Light color="#8aa9d8" intensity={0.42} type="directional" castShadows={false} />
            </Entity>
            <Entity name="cauldron-practical" position={[0, 5.15, -0.15]}>
                <Light color="#5ccfe0" intensity={2.2} range={5.5} type="omni" castShadows={false} />
            </Entity>

            <SharedModel {...WORKSHOP_LAYOUT.workbench} onStateChange={onAssetStateChange} />
            <SharedModel {...WORKSHOP_LAYOUT.cauldron} onStateChange={onAssetStateChange} />

            {WORKSHOP_LAYOUT.slots.map((slot) => {
                const ingredient = ingredientPlacement(slot);
                return (
                    <Entity key={slot.index} name={`ingredient-slot-${slot.index + 1}`} position={[...slot.position]}>
                        <Entity scale={[0.72, 0.06, 0.72]} position={[0, 0.02, 0]}>
                            <Render type="cylinder" material={slotMaterial} castShadows receiveShadows />
                        </Entity>
                        {ingredient ? (
                            <SharedModel
                                {...ingredient}
                                position={[0, ingredient.position[1] - slot.position[1], 0]}
                                onStateChange={onAssetStateChange}
                            />
                        ) : null}
                    </Entity>
                );
            })}
        </>
    );
}
