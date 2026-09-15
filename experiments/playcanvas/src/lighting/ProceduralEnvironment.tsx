/* eslint-disable react-hooks/immutability -- This lifecycle component intentionally owns PlayCanvas Scene environment state. */
import { useApp } from '@playcanvas/react/hooks';
import { Color, EnvLighting, PIXELFORMAT_RGBA8, TEXTUREPROJECTION_EQUIRECT, Texture } from 'playcanvas';
import { useLayoutEffect } from 'react';

import type { LightingProfile } from './lightingProfiles';

export type EnvironmentMetrics = {
    readonly generationMs: number;
    readonly atlasSize: number;
};

type ProceduralEnvironmentProps = {
    onReady: (metrics: EnvironmentMetrics) => void;
    profile: LightingProfile;
};

type Rgb = readonly [number, number, number];

function mix(left: number, right: number, amount: number): number {
    return left + (right - left) * amount;
}

function environmentPixels(variant: LightingProfile['variant'], width = 128, height = 64): Uint8Array {
    const pixels = new Uint8Array(width * height * 4);
    const upper: Rgb = variant === 'warm' ? [25, 34, 55] : [37, 46, 63];
    const horizon: Rgb = variant === 'warm' ? [112, 79, 65] : [88, 92, 104];
    const lower: Rgb = variant === 'warm' ? [28, 17, 24] : [23, 24, 30];

    for (let y = 0; y < height; y += 1) {
        const v = y / (height - 1);
        const from = v < 0.52 ? upper : horizon;
        const to = v < 0.52 ? horizon : lower;
        const verticalMix = v < 0.52 ? v / 0.52 : (v - 0.52) / 0.48;
        for (let x = 0; x < width; x += 1) {
            const u = x / (width - 1);
            const wrappedU = Math.min(Math.abs(u - 0.72), 1 - Math.abs(u - 0.72));
            const keyGlow = Math.exp(-(wrappedU * wrappedU * 120 + (v - 0.38) ** 2 * 85));
            const index = (y * width + x) * 4;
            pixels[index] = Math.min(255, mix(from[0], to[0], verticalMix) + keyGlow * 105);
            pixels[index + 1] = Math.min(255, mix(from[1], to[1], verticalMix) + keyGlow * 72);
            pixels[index + 2] = Math.min(255, mix(from[2], to[2], verticalMix) + keyGlow * 42);
            pixels[index + 3] = 255;
        }
    }
    return pixels;
}

export function ProceduralEnvironment({ onReady, profile }: ProceduralEnvironmentProps) {
    const app = useApp();

    useLayoutEffect(() => {
        const startedAt = performance.now();
        const previousAtlas = app.scene.envAtlas;
        const previousAmbient = app.scene.ambientLight.clone();
        const previousExposure = app.scene.exposure;
        const source = new Texture(app.graphicsDevice, {
            name: `kesselkrawall-${profile.variant}-environment`,
            width: 128,
            height: 64,
            format: PIXELFORMAT_RGBA8,
            projection: TEXTUREPROJECTION_EQUIRECT,
            srgb: true,
            mipmaps: false,
            levels: [environmentPixels(profile.variant)]
        });
        const lightingSource = EnvLighting.generateLightingSource(source, {
            size: profile.quality === 'mobile' ? 32 : 64
        });
        const atlas = EnvLighting.generateAtlas(lightingSource, {
            size: profile.environmentSize,
            numReflectionSamples: profile.reflectionSamples,
            numAmbientSamples: profile.ambientSamples
        });

        app.scene.envAtlas = atlas;
        app.scene.ambientLight =
            profile.variant === 'warm' ? new Color(0.12, 0.105, 0.14) : new Color(0.14, 0.15, 0.18);
        app.scene.exposure = profile.exposure;
        onReady({ generationMs: performance.now() - startedAt, atlasSize: profile.environmentSize });

        return () => {
            app.scene.envAtlas = previousAtlas;
            app.scene.ambientLight = previousAmbient;
            app.scene.exposure = previousExposure;
            atlas.destroy();
            lightingSource.destroy();
            source.destroy();
        };
    }, [app, onReady, profile]);

    return null;
}
