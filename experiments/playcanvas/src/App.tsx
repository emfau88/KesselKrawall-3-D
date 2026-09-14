import { Application, Entity } from '@playcanvas/react';
import { Camera, Light, Render } from '@playcanvas/react/components';
import { useAppEvent } from '@playcanvas/react/hooks';
import type { Entity as PcEntity } from 'playcanvas';
import { useRef } from 'react';

import { EXPERIMENT_CONTRACT } from './app/experimentContract';
import { ExperimentErrorBoundary } from './app/ExperimentErrorBoundary';

function Scene() {
    const marker = useRef<PcEntity>(null);

    useAppEvent('update', (dt: number) => marker.current?.rotate(0, 22 * dt, 0));

    return (
        <>
            <Entity name="camera" position={[0, 0.35, 4.5]}>
                <Camera clearColor="#160d18" fov={40} />
            </Entity>
            <Entity name="key-light" rotation={[38, 28, 0]}>
                <Light color="#ffd09a" intensity={1.25} type="directional" />
            </Entity>
            <Entity name="bakeoff-marker" ref={marker} rotation={[28, 0, 45]} scale={[0.9, 0.9, 0.9]}>
                <Render type="box" />
            </Entity>
        </>
    );
}

function App() {
    return (
        <ExperimentErrorBoundary>
            <Application>
                <Scene />
            </Application>
            <aside className="experiment-status" aria-label="PlayCanvas-Experimentstatus">
                <small>ISOLIERTER RENDERING-BAKEOFF</small>
                <h1>KesselKrawall · PlayCanvas</h1>
                <p>PC-C1 · Technische Bühne</p>
                <dl>
                    <div>
                        <dt>Engine</dt>
                        <dd>PlayCanvas React</dd>
                    </div>
                    <div>
                        <dt>Editor/MCP</dt>
                        <dd>Nicht verwendet</dd>
                    </div>
                    <div>
                        <dt>Produktion</dt>
                        <dd>Unverändert</dd>
                    </div>
                </dl>
                <code>{EXPERIMENT_CONTRACT.previewPath}</code>
            </aside>
        </ExperimentErrorBoundary>
    );
}

export default App;
