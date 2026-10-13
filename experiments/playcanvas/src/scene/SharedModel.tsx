import { Container } from '@playcanvas/react';
import { useModel } from '@playcanvas/react/hooks';
import { useEffect } from 'react';

import { SHARED_ASSETS, sharedAssetUrl } from '../assets/sharedAssets';
import type { SharedAssetId } from '../assets/sharedAssets';

import type { AssetPlacement } from './layout';

export type AssetLoadState = 'loading' | 'ready' | 'error';

type SharedModelProps = {
    asset: SharedAssetId;
    onStateChange: (asset: SharedAssetId, state: AssetLoadState, error?: string) => void;
} & Omit<AssetPlacement, 'asset'>;

export function SharedModel({ asset: id, position, rotation, scale, onStateChange }: SharedModelProps) {
    const { asset, loading, error } = useModel(sharedAssetUrl(id));

    useEffect(() => {
        onStateChange(id, error ? 'error' : loading || !asset ? 'loading' : 'ready', error ?? undefined);
    }, [asset, error, id, loading, onStateChange]);

    if (!asset) return null;

    return (
        <Container
            asset={asset}
            name={SHARED_ASSETS[id].label}
            position={[...position]}
            rotation={rotation ? [...rotation] : undefined}
            scale={scale ? [...scale] : undefined}
        />
    );
}
