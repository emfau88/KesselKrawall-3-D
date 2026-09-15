import { Application } from '@playcanvas/react';
import { FILLMODE_FILL_WINDOW, RESOLUTION_AUTO } from 'playcanvas';
import { useCallback, useMemo, useState } from 'react';

import { ExperimentErrorBoundary } from './app/ExperimentErrorBoundary';
import { SHARED_ASSETS, SHARED_ASSET_IDS } from './assets/sharedAssets';
import type { SharedAssetId } from './assets/sharedAssets';
import { useResponsiveCameraProfile } from './camera/cameraProfiles';
import { useLightingProfile } from './lighting/lightingProfiles';
import type { EnvironmentMetrics } from './lighting/ProceduralEnvironment';
import { CalibrationScene } from './scene/CalibrationScene';
import type { AssetLoadState } from './scene/SharedModel';

type AssetStatus = { state: AssetLoadState; error?: string };

function App() {
    const cameraProfile = useResponsiveCameraProfile();
    const lightingProfile = useLightingProfile(cameraProfile.id);
    const [environmentMetrics, setEnvironmentMetrics] = useState<EnvironmentMetrics | null>(null);
    const [assetStates, setAssetStates] = useState<Partial<Record<SharedAssetId, AssetStatus>>>({});
    const onAssetStateChange = useCallback((asset: SharedAssetId, state: AssetLoadState, error?: string) => {
        setAssetStates((current) => {
            const previous = current[asset];
            if (previous?.state === state && previous.error === error) return current;
            return { ...current, [asset]: { state, error } };
        });
    }, []);
    const summary = useMemo(() => {
        const ready = SHARED_ASSET_IDS.filter((id) => assetStates[id]?.state === 'ready');
        const failed = SHARED_ASSET_IDS.filter((id) => assetStates[id]?.state === 'error');
        return { ready, failed, complete: ready.length === SHARED_ASSET_IDS.length };
    }, [assetStates]);
    const onEnvironmentReady = useCallback((metrics: EnvironmentMetrics) => setEnvironmentMetrics(metrics), []);
    const sceneReady = summary.complete && environmentMetrics !== null;

    return (
        <ExperimentErrorBoundary>
            <Application fillMode={FILLMODE_FILL_WINDOW} resolutionMode={RESOLUTION_AUTO}>
                <CalibrationScene
                    cameraProfile={cameraProfile}
                    lightingProfile={lightingProfile}
                    onAssetStateChange={onAssetStateChange}
                    onEnvironmentReady={onEnvironmentReady}
                />
            </Application>
            {!sceneReady ? (
                <section
                    className={`asset-loader ${summary.failed.length ? 'asset-loader--error' : ''}`}
                    role="status"
                    aria-live="polite"
                >
                    <span className="asset-loader__sigil" aria-hidden="true" />
                    <div>
                        <small>{summary.failed.length ? 'ASSET-FEHLER' : 'WERKBANK WIRD VORBEREITET'}</small>
                        <strong>
                            {environmentMetrics
                                ? `${summary.ready.length} / ${SHARED_ASSET_IDS.length} Referenzmodelle geladen`
                                : 'IBL wird vorbereitet'}
                        </strong>
                        {summary.failed.map((id) => (
                            <p key={id}>
                                {SHARED_ASSETS[id].label}: {assetStates[id]?.error}
                            </p>
                        ))}
                    </div>
                </section>
            ) : null}
            <aside className="experiment-status" aria-label="PlayCanvas-Experimentstatus">
                <small>ISOLIERTER RENDERING-BAKEOFF</small>
                <h1>KesselKrawall · PlayCanvas</h1>
                <p>PC-C4 · Licht, IBL &amp; Farbmanagement</p>
                <dl>
                    <div>
                        <dt>Modelle</dt>
                        <dd>
                            {summary.ready.length}/{SHARED_ASSET_IDS.length} bereit
                        </dd>
                    </div>
                    <div>
                        <dt>Quelle</dt>
                        <dd>public/assets</dd>
                    </div>
                    <div>
                        <dt>Kamera</dt>
                        <dd>{cameraProfile.label}</dd>
                    </div>
                    <div>
                        <dt>FOV</dt>
                        <dd>{cameraProfile.fov}°</dd>
                    </div>
                    <div>
                        <dt>Viewport</dt>
                        <dd>{cameraProfile.viewport.join('×')}</dd>
                    </div>
                    <div>
                        <dt>Licht</dt>
                        <dd>{lightingProfile.label}</dd>
                    </div>
                    <div>
                        <dt>IBL</dt>
                        <dd>
                            {environmentMetrics
                                ? `${environmentMetrics.atlasSize}px · ${environmentMetrics.generationMs.toFixed(0)} ms`
                                : 'lädt'}
                        </dd>
                    </div>
                </dl>
                <code>{cameraProfile.automatic ? 'AUTO' : 'FORCED'} · ?light=neutral&amp;quality=mobile</code>
            </aside>
        </ExperimentErrorBoundary>
    );
}

export default App;
