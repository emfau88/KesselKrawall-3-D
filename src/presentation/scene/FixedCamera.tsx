import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { OrthographicCamera } from "three";
import type { GreyboxMode } from "./GreyboxStage";

export function FixedCamera({ mode }: { mode: GreyboxMode }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useLayoutEffect(() => {
    const portrait = size.height > size.width;
    if (mode === "workshop") {
      camera.position.set(portrait ? 1.1 : 0.5, portrait ? 10.8 : 8.25, portrait ? 18.8 : 17.6);
      camera.lookAt(0, portrait ? 0.62 : 0.5, 0.42);
    } else {
      camera.position.set(portrait ? 1.25 : 0.85, portrait ? 12.25 : 9.1, portrait ? 21.3 : 20.4);
      camera.lookAt(0, portrait ? 0.9 : 1.05, -0.28);
    }

    if (camera instanceof OrthographicCamera) {
      const heightZoom = size.height / (mode === "workshop" ? 8.65 : 9.55);
      const widthZoom = size.width / (mode === "workshop" ? 11.8 : 13.25);
      camera.zoom = portrait
        ? Math.max(41, Math.min(mode === "workshop" ? 54 : 54, heightZoom * 0.52))
        : Math.max(25, Math.min(mode === "workshop" ? 72 : 78, heightZoom, widthZoom));
      camera.near = 0.1;
      camera.far = 80;
      camera.updateProjectionMatrix();
    }
  }, [camera, mode, size.height, size.width]);

  return null;
}
