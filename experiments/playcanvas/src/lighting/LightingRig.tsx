import { Entity } from '@playcanvas/react';
import { Light, Render } from '@playcanvas/react/components';
import { Color, SHADOW_PCF3, StandardMaterial } from 'playcanvas';

import type { LightingProfile } from './lightingProfiles';

const candleWax = new StandardMaterial();
candleWax.diffuse = new Color(0.72, 0.57, 0.38);
candleWax.gloss = 0.18;
candleWax.update();

const candleFlame = new StandardMaterial();
candleFlame.diffuse = new Color(1, 0.53, 0.12);
candleFlame.emissive = new Color(1, 0.27, 0.035);
candleFlame.emissiveIntensity = 3.4;
candleFlame.gloss = 0.12;
candleFlame.update();

function CandlePractical({ position }: { position: [number, number, number] }) {
    return (
        <Entity name="visible-candle-practical" position={position}>
            <Entity position={[0, -0.18, 0]} scale={[0.11, 0.36, 0.11]}>
                <Render type="cylinder" material={candleWax} castShadows />
            </Entity>
            <Entity position={[0, 0.11, 0]} scale={[0.075, 0.18, 0.075]}>
                <Render type="sphere" material={candleFlame} castShadows={false} />
            </Entity>
            <Light color="#ff9f52" intensity={0.95} range={3.6} type="omni" castShadows={false} />
        </Entity>
    );
}

export function LightingRig({ profile }: { profile: LightingProfile }) {
    return (
        <>
            <Entity name="warm-key" rotation={[43, 31, 0]}>
                <Light
                    type="directional"
                    color={profile.key.color}
                    intensity={profile.key.intensity}
                    castShadows
                    shadowType={SHADOW_PCF3}
                    shadowDistance={22}
                    shadowResolution={profile.shadowResolution}
                    shadowBias={0.18}
                    normalOffsetBias={0.035}
                />
            </Entity>
            <Entity name="cool-fill" rotation={[24, -142, 0]}>
                <Light
                    type="directional"
                    color={profile.fill.color}
                    intensity={profile.fill.intensity}
                    castShadows={false}
                />
            </Entity>
            <Entity name="cauldron-rim" rotation={[68, 164, 18]}>
                <Light
                    type="directional"
                    color={profile.rim.color}
                    intensity={profile.rim.intensity}
                    castShadows={false}
                />
            </Entity>
            <Entity name="visible-cauldron-practical" position={[0, 5.08, -0.2]}>
                <Light color="#55cfdf" intensity={1.7} range={5.2} type="omni" castShadows={false} />
            </Entity>
            <CandlePractical position={[-3.35, 3.18, -1.15]} />
            <CandlePractical position={[3.35, 3.18, -1.15]} />
        </>
    );
}
