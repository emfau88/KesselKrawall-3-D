import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
}

interface State {
  readonly failed: boolean;
}

export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Die 3D-Szene konnte nicht gestartet werden.", error, info);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className="scene-fallback" role="alert">
          <strong>Die 3D-Werkstatt konnte nicht gestartet werden.</strong>
          <span>Bitte aktiviere WebGL oder starte die Seite neu.</span>
          <button onClick={() => window.location.reload()} type="button">Neu laden</button>
        </div>
      );
    }
    return this.props.children;
  }
}
