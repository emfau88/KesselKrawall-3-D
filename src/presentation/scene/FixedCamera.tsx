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
      camera.position.set(portrait ? 2.4 : 3.6, portrait ? 11.8 : 10.8, portrait ? 14.8 : 14.2);
      camera.lookAt(0, portrait ? 0.75 : 0.68, 0.45);
    } else {
      camera.position.set(portrait ? 3.6 : 5.2, portrait ? 12.6 : 11.2, portrait ? 15.8 : 14.4);
      camera.lookAt(0, 0.62, 0);
    }

    if (camera instanceof OrthographicCamera) {
      const heightZoom = size.height / (mode === "workshop" ? 10.2 : 10.8);
      const widthZoom = size.width / (mode === "workshop" ? 12.6 : 13.2);
      camera.zoom = Math.max(27, Math.min(72, heightZoom, widthZoom));
      camera.near = 0.1;
      camera.far = 80;
      camera.updateProjectionMatrix();
    }
  }, [camera, mode, size.height, size.width]);

  return null;
}
