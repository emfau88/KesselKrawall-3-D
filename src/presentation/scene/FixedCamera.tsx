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
      camera.position.set(portrait ? 1.65 : 0.7, portrait ? 11.2 : 8.35, portrait ? 19.4 : 18.2);
      camera.lookAt(0, portrait ? 0.68 : 0.58, -0.25);
    }

    if (camera instanceof OrthographicCamera) {
      const heightZoom = size.height / (mode === "workshop" ? 8.65 : 8.7);
      const widthZoom = size.width / (mode === "workshop" ? 11.8 : 12);
      camera.zoom = Math.max(27, Math.min(mode === "workshop" ? 72 : 84, heightZoom, widthZoom));
      camera.near = 0.1;
      camera.far = 80;
      camera.updateProjectionMatrix();
    }
  }, [camera, mode, size.height, size.width]);

  return null;
}
