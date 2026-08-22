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
      camera.position.set(portrait ? 1.1 : 0.85, portrait ? 14.2 : 9.8, portrait ? 25.2 : 21.4);
      camera.lookAt(0, portrait ? 0.72 : 0.92, -0.42);
    }

    if (camera instanceof OrthographicCamera) {
      const heightZoom = size.height / (mode === "workshop" ? 8.65 : 11.1);
      const widthZoom = size.width / (mode === "workshop" ? 11.8 : 14.8);
      camera.zoom = portrait
        ? mode === "workshop"
          ? Math.max(41, Math.min(54, heightZoom * 0.52))
          : Math.max(35, Math.min(41, size.width / 10.5))
        : Math.max(25, Math.min(mode === "workshop" ? 72 : 68, heightZoom, widthZoom));
      camera.near = 0.1;
      camera.far = 80;
      camera.updateProjectionMatrix();
    }
  }, [camera, mode, size.height, size.width]);

  return null;
}
