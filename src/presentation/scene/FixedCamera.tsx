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
      camera.position.set(portrait ? 1.4 : 0.75, portrait ? 12.2 : 11.15, portrait ? 15.2 : 14.8);
      camera.lookAt(0, portrait ? 0.75 : 0.72, 0.35);
    } else {
      camera.position.set(portrait ? 2.1 : 1.15, portrait ? 12.8 : 11.55, portrait ? 16.1 : 15.25);
      camera.lookAt(0, 0.62, 0);
    }

    if (camera instanceof OrthographicCamera) {
      const heightZoom = size.height / (mode === "workshop" ? 8.65 : 9.35);
      const widthZoom = size.width / (mode === "workshop" ? 11.8 : 12.4);
      camera.zoom = Math.max(27, Math.min(72, heightZoom, widthZoom));
      camera.near = 0.1;
      camera.far = 80;
      camera.updateProjectionMatrix();
    }
  }, [camera, mode, size.height, size.width]);

  return null;
}
