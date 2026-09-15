import { useMemo } from 'react';

import type { CameraProfileId } from '../camera/cameraProfiles';

export type LightingVariant = 'warm' | 'neutral';
export type LightingQuality = 'desktop' | 'mobile';

export type LightingProfile = {
    readonly variant: LightingVariant;
    readonly quality: LightingQuality;
    readonly label: string;
    readonly exposure: number;
    readonly environmentSize: number;
    readonly reflectionSamples: number;
    readonly ambientSamples: number;
    readonly shadowResolution: number;
    readonly key: { readonly color: string; readonly intensity: number };
    readonly fill: { readonly color: string; readonly intensity: number };
    readonly rim: { readonly color: string; readonly intensity: number };
};

export function resolveLightingProfile(camera: CameraProfileId, search: string): LightingProfile {
    const params = new URLSearchParams(search);
    const requestedVariant = params.get('light');
    const variant: LightingVariant = requestedVariant === 'neutral' ? 'neutral' : 'warm';
    const requestedQuality = params.get('quality');
    const automaticQuality: LightingQuality = camera === 'desktop' ? 'desktop' : 'mobile';
    const quality: LightingQuality =
        requestedQuality === 'desktop' || requestedQuality === 'mobile' ? requestedQuality : automaticQuality;
    const mobile = quality === 'mobile';

    return {
        variant,
        quality,
        label: `${variant === 'warm' ? 'Warm' : 'Neutral'} · ${mobile ? 'Mobile' : 'Desktop'}`,
        exposure: variant === 'warm' ? 1.04 : 0.98,
        environmentSize: mobile ? 128 : 256,
        reflectionSamples: mobile ? 32 : 64,
        ambientSamples: mobile ? 64 : 128,
        shadowResolution: mobile ? 1024 : 2048,
        key: {
            color: variant === 'warm' ? '#ffd0a0' : '#f1dfce',
            intensity: variant === 'warm' ? 1.52 : 1.34
        },
        fill: {
            color: variant === 'warm' ? '#829dca' : '#a9bbd5',
            intensity: variant === 'warm' ? 0.4 : 0.46
        },
        rim: {
            color: variant === 'warm' ? '#b69bdd' : '#b8c9ef',
            intensity: variant === 'warm' ? 0.7 : 0.64
        }
    };
}

export function useLightingProfile(camera: CameraProfileId): LightingProfile {
    return useMemo(() => resolveLightingProfile(camera, window.location.search), [camera]);
}
