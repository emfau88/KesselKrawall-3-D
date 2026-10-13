import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type Props = {
    children: ReactNode;
};

type State = {
    failed: boolean;
};

export class ExperimentErrorBoundary extends Component<Props, State> {
    state: State = { failed: false };

    static getDerivedStateFromError(): State {
        return { failed: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('PlayCanvas bakeoff failed to initialize.', error, info);
    }

    render() {
        if (this.state.failed) {
            return (
                <main className="experiment-fallback" role="alert">
                    <h1>Die PlayCanvas-Testbühne konnte nicht gestartet werden.</h1>
                    <p>Dieser isolierte Versuch beeinflusst das veröffentlichte KesselKrawall-3D-Spiel nicht.</p>
                </main>
            );
        }
        return this.props.children;
    }
}
