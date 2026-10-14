import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { AdditiveBlending, Color, DoubleSide, Mesh, Quaternion, ShaderMaterial, Vector3, type Vector3Tuple } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ProductionAsset, ProductionAssetBoundary, productionAssetUrl } from "./ProductionAsset";
import { mockupAssetId, type MockupAssetSlug } from "./mockupAssetIds";
import { LIGHTING_LOOKS, lightingLook } from "./lightingLook";

type AssetProps = {
  asset: MockupAssetSlug;
  position?: Vector3Tuple;
  rotation?: Vector3Tuple;
  scale?: number | Vector3Tuple;
  castShadow?: boolean;
  receiveShadow?: boolean;
};

export function MockupAsset(props: AssetProps) {
  return <ProductionAsset {...props} asset={mockupAssetId(props.asset)} />;
}

function WickFlame({ position, phase }: { position: Vector3Tuple; phase: number }) {
  const mesh = useRef<Mesh>(null);
  const parentRotation = useMemo(() => new Quaternion(), []);
  const cameraRotation = useMemo(() => new Quaternion(), []);
  const material = useMemo(() => new ShaderMaterial({
    transparent: true, depthWrite: false, side: DoubleSide,
    blending: AdditiveBlending, toneMapped: false,
    uniforms: { uTime: { value: 0 }, uPhase: { value: phase }, uColor: { value: new Color("#ff872a") } },
    vertexShader: "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: `
      varying vec2 vUv; uniform float uTime; uniform float uPhase; uniform vec3 uColor;
      void main(){
        float y=vUv.y; float sway=sin(y*7.0-uTime*5.2+uPhase)*0.065*y;
        float x=vUv.x-0.5-sway;
        float width=(0.27*sin(y*3.14159)+0.025)*(1.0-y*0.35);
        float edge=1.0-smoothstep(width*0.38,width,abs(x));
        float alpha=edge*smoothstep(0.0,0.09,y)*(1.0-smoothstep(0.75,1.0,y));
        float core=(1.0-smoothstep(0.0,0.12,abs(x)))*(1.0-y);
        vec3 color=mix(uColor,vec3(1.0,0.92,0.57),core);
        gl_FragColor=vec4(color,alpha*0.92);
      }
    `,
  }), [phase]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock, camera }) => {
    material.uniforms.uTime!.value = clock.elapsedTime;
    if (!mesh.current) return;
    camera.getWorldQuaternion(cameraRotation);
    mesh.current.parent?.getWorldQuaternion(parentRotation);
    mesh.current.quaternion.copy(parentRotation.invert()).multiply(cameraRotation);
    const pulse = 1 + Math.sin(clock.elapsedTime * 8.1 + phase) * 0.055;
    mesh.current.scale.set(1 / pulse, pulse, 1);
  });
  return (
    <group position={position} userData={{ wickAnchor: true }}>
      <mesh ref={mesh} position={[0, 0.105, 0]} material={material}>
        <planeGeometry args={[0.24, 0.28]} />
      </mesh>
    </group>
  );
}

function AnchoredCandles({ asset, light = false }: {
  asset: "triple-candleholder" | "wall-candle-sconce";
  light?: boolean;
}) {
  const id = mockupAssetId(asset);
  const gltf = useLoader(GLTFLoader, productionAssetUrl(id));
  const anchors = useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    return (asset === "triple-candleholder" ? ["Wick_L", "Wick_C", "Wick_R"] : ["Wick"])
      .map((name) => {
        const node = gltf.scene.getObjectByName(name);
        if (!node) throw new Error(`Dochtanker ${name} fehlt in ${id}`);
        return node.getWorldPosition(new Vector3()).toArray() as Vector3Tuple;
      });
  }, [asset, gltf.scene, id]);
  const lightPosition = anchors[0]!;
  const look = lightingLook();
  return (
    <group userData={{ mockupCandles: asset }}>
      <ProductionAsset asset={id} />
      {anchors.map((anchor, index) => <WickFlame key={index} position={anchor} phase={index * 1.7} />)}
      {light && <pointLight color="#ffb76a" intensity={look === "reference" ? 2.6 : LIGHTING_LOOKS[look].candle} distance={5.2} decay={2} position={[lightPosition[0], lightPosition[1] + 0.15, lightPosition[2] + 0.12]} />}
    </group>
  );
}

export function MockupCandles({ asset = "triple-candleholder", position, rotation, scale = 1, light = false }: {
  asset?: "triple-candleholder" | "wall-candle-sconce";
  position?: Vector3Tuple;
  rotation?: Vector3Tuple;
  scale?: number;
  light?: boolean;
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <ProductionAssetBoundary fallback={null}>
        <Suspense fallback={null}><AnchoredCandles asset={asset} light={light} /></Suspense>
      </ProductionAssetBoundary>
    </group>
  );
}
