import { useSyncExternalStore } from 'react';

import type { Vec3 } from '../scene/layout';

import cameraProfileData from './cameraProfiles.json';

export type CameraProfileId = 'desktop' | 'landscape' | 'portrait';

export type CameraProfile = {
    readonly id: CameraProfileId;
    readonly label: string;
    readonly position: Vec3;
    readonly target: Vec3;
    readonly fov: number;
    readonly nearClip: number;
    readonly farClip: number;
};

export const CAMERA_PROFILES = Object.freeze(
    cameraProfileData as unknown as Readonly<Record<CameraProfileId, CameraProfile>>
);

export type ResolvedCameraProfile = CameraProfile & {
    readonly automatic: boolean;
    readonly viewport: readonly [number, number];
};

function readViewport(): string {
    return `${window.innerWidth}x${window.innerHeight}`;
}

function subscribeViewport(onChange: () => void): () => void {
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    return () => {
        window.removeEventListener('resize', onChange);
        window.removeEventListener('orientationchange', onChange);
    };
}

export function automaticProfileId(width: number, height: number): CameraProfileId {
    const aspect = width / Math.max(height, 1);
    if (aspect < 0.8) return 'portrait';
    if (height <= 500 && aspect >= 1.5) return 'landscape';
    return 'desktop';
}

export function resolveCameraProfile(width: number, height: number, search: string): ResolvedCameraProfile {
    const params = new URLSearchParams(search);
    const requested = params.get('camera');
    const forcedId =
        requested === 'desktop' || requested === 'landscape' || requested === 'portrait' ? requested : null;
    const id = forcedId ?? automaticProfileId(width, height);
    const requestedFov = Number(params.get('fov'));
    const fov =
        Number.isFinite(requestedFov) && requestedFov >= 35 && requestedFov <= 45
            ? requestedFov
            : CAMERA_PROFILES[id].fov;

    return {
        ...CAMERA_PROFILES[id],
        fov,
        automatic: forcedId === null,
        viewport: [width, height]
    };
}

export function useResponsiveCameraProfile(): ResolvedCameraProfile {
    const viewport = useSyncExternalStore(subscribeViewport, readViewport, () => '1280x720');
    const [width, height] = viewport.split('x').map(Number) as [number, number];
    return resolveCameraProfile(width, height, window.location.search);
}
