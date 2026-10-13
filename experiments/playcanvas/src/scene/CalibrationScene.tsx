import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { Color, StandardMaterial } from 'playcanvas';

import type { SharedAssetId } from '../assets/sharedAssets';
import type { ResolvedCameraProfile } from '../camera/cameraProfiles';
import { ResponsiveCamera } from '../camera/ResponsiveCamera';
import type { LightingProfile } from '../lighting/lightingProfiles';
import { LightingRig } from '../lighting/LightingRig';
import { ProceduralEnvironment } from '../lighting/ProceduralEnvironment';
import type { EnvironmentMetrics } from '../lighting/ProceduralEnvironment';

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
    lightingProfile: LightingProfile;
    onAssetStateChange: (asset: SharedAssetId, state: AssetLoadState, error?: string) => void;
    onEnvironmentReady: (metrics: EnvironmentMetrics) => void;
};

export function CalibrationScene({
    cameraProfile,
    lightingProfile,
    onAssetStateChange,
    onEnvironmentReady
}: CalibrationSceneProps) {
    return (
        <>
            <ResponsiveCamera profile={cameraProfile} />
            <ProceduralEnvironment profile={lightingProfile} onReady={onEnvironmentReady} />
            <LightingRig profile={lightingProfile} />

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
