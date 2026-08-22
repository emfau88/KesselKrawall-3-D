import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, type Vector3Tuple } from "three";

import { getOpponentPresentation, type ArenaMotif } from "../content/opponentPresentation";

function GlowPool({ position, color, scale = 1, angular = false }: {
  position: Vector3Tuple;
  color: string;
  scale?: number;
  angular?: boolean;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        {angular ? <ringGeometry args={[0.32, 0.72, 8]} /> : <ringGeometry args={[0.28, 0.72, 24]} />}
        <meshStandardMaterial color="#211b20" emissive={color} emissiveIntensity={0.5} transparent opacity={0.82} />
      </mesh>
      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.48, 0.027, 6, angular ? 8 : 28]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.68} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ShieldMonolith({ position, color, side }: { position: Vector3Tuple; color: string; side: -1 | 1 }) {
  return (
    <group position={position} rotation={[0, side * -0.22, side * -0.05]}>
      <mesh castShadow position={[0, 0.72, 0]} scale={[0.78, 1.08, 0.3]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.72, 0.72, 0.18]} />
        <meshStandardMaterial color="#596974" metalness={0.42} roughness={0.52} />
      </mesh>
      <mesh position={[0, 0.72, 0.12]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.26, 0.26, 0.08]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.15} />
      </mesh>
      <mesh castShadow position={[0, -0.02, 0]}><cylinderGeometry args={[0.28, 0.42, 0.7, 8]} /><meshStandardMaterial color="#3b454e" roughness={0.82} /></mesh>
    </group>
  );
}

function EmberCellar({ glow, secondary }: { glow: string; secondary: string }) {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 4.82, 0.1, -2.2]}>
          {[0, 1, 2].map((index) => (
            <mesh key={index} position={[side * index * -0.28, index * 0.34, index * -0.16]} scale={[0.72, 1.2 + index * 0.2, 0.72]}>
              <coneGeometry args={[0.15 + index * 0.025, 0.6 + index * 0.18, 7]} />
              <meshBasicMaterial color={index % 2 ? secondary : glow} toneMapped={false} transparent opacity={0.86} depthWrite={false} />
            </mesh>
          ))}
          <pointLight color={glow} intensity={3.2} distance={5.2} position={[0, 0.6, 0]} />
        </group>
      ))}
      {[-4.4, -2.2, 2.2, 4.4].map((x, index) => <GlowPool key={x} angular color={index % 2 ? secondary : glow} position={[x, -0.12, index % 2 ? -3.85 : -1.1]} scale={0.62} />)}
      <group position={[0, 3.55, -5.62]}>
        {[-1, 0, 1].map((side) => <mesh key={side} position={[side * 0.46, Math.abs(side) * -0.18, 0]} scale={[0.8, 1.45, 0.8]}><coneGeometry args={[0.18, 0.85, 7]} /><meshStandardMaterial color={side === 0 ? secondary : glow} emissive={glow} emissiveIntensity={0.8} /></mesh>)}
      </group>
    </group>
  );
}

function RunicBastion({ glow }: { glow: string }) {
  return (
    <group>
      {[-1, 1].flatMap((side) => [0, 1].map((row) => (
        <ShieldMonolith key={`${side}-${row}`} color={glow} side={side as -1 | 1} position={[side * (5.15 - row * 0.35), 0.02, -3.8 + row * 2.85]} />
      )))}
      {Array.from({ length: 8 }, (_, index) => {
        const angle = index / 8 * Math.PI * 2;
        return <mesh key={index} position={[Math.cos(angle) * 4.15, -0.08, Math.sin(angle) * 4.15 - 0.25]} rotation={[-Math.PI / 2, 0, angle]}><ringGeometry args={[0.13, 0.22, 6]} /><meshBasicMaterial color={glow} toneMapped={false} transparent opacity={0.72} depthWrite={false} /></mesh>;
      })}
    </group>
  );
}

function StormForge({ glow, secondary }: { glow: string; secondary: string }) {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 4.9, 0.35, -3.45]}>
          <mesh castShadow><cylinderGeometry args={[0.09, 0.13, 2.8, 8]} /><meshStandardMaterial color="#6f596f" metalness={0.62} roughness={0.3} /></mesh>
          <mesh position={[0, 1.62, 0]} scale={[0.74, 1.42, 0.74]}><octahedronGeometry args={[0.28, 0]} /><meshBasicMaterial color={side === 1 ? glow : secondary} toneMapped={false} /></mesh>
          {[0, 1, 2].map((index) => <mesh key={index} position={[0, 0.35 + index * 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.2 + index * 0.04, 0.025, 6, 18]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.9} /></mesh>)}
          <pointLight color={glow} intensity={3.4} distance={5.2} position={[0, 1.5, 0]} />
        </group>
      ))}
      {[-3.4, 3.4].map((x, index) => <GlowPool key={x} angular color={index ? glow : secondary} position={[x, -0.12, -1.1]} scale={0.72} />)}
    </group>
  );
}

function ToxicLaboratory({ glow, secondary }: { glow: string; secondary: string }) {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 5.12, 0.22, -2.8]}>
          <mesh castShadow><cylinderGeometry args={[0.5, 0.62, 1.35, 12]} /><meshStandardMaterial color="#344039" metalness={0.32} roughness={0.66} /></mesh>
          <mesh position={[0, 0.15, 0.35]}><cylinderGeometry args={[0.34, 0.4, 0.86, 12]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.6} transparent opacity={0.62} /></mesh>
          <mesh position={[side * -0.42, 0.88, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.42, 0.08, 8, 22, Math.PI * 1.4]} /><meshStandardMaterial color="#7e765b" metalness={0.48} roughness={0.42} /></mesh>
          <pointLight color={glow} intensity={2.8} distance={4.8} />
        </group>
      ))}
      {[-4.3, -2.5, 2.6, 4.35].map((x, index) => <GlowPool key={x} color={index % 2 ? secondary : glow} position={[x, -0.12, index % 2 ? -4 : -1.25]} scale={0.78} />)}
    </group>
  );
}

function StoneHearth({ glow }: { glow: string }) {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 5.1, -0.05, -3.7]}>
          {Array.from({ length: 5 }, (_, index) => <mesh key={index} castShadow position={[(index % 2) * side * 0.45, Math.floor(index / 2) * 0.42, (index % 3) * 0.12]} rotation={[0, side * index * 0.1, (index % 2 ? 1 : -1) * 0.05]}><boxGeometry args={[0.72, 0.4, 0.54]} /><meshStandardMaterial color={index % 2 ? "#806b58" : "#66584d"} roughness={0.95} /></mesh>)}
          <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.55, 0.12, 8, 22, Math.PI]} /><meshStandardMaterial color="#987452" roughness={0.75} /></mesh>
          <pointLight color={glow} intensity={3.1} distance={5} position={[0, 0.8, 0.3]} />
        </group>
      ))}
      {[-3.5, 3.5].map((x) => <GlowPool key={x} angular color={glow} position={[x, -0.12, -1.4]} scale={0.66} />)}
    </group>
  );
}

function ArcaneGrandstand({ glow, secondary }: { glow: string; secondary: string }) {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 4.65, 1.18, -3.82]}>
          {[0, 1, 2].map((index) => <mesh key={index} rotation={[index * 0.72, index * 0.54, index * 0.9]}><torusGeometry args={[0.5 + index * 0.14, 0.035, 7, 30]} /><meshStandardMaterial color={index === 1 ? secondary : glow} emissive={glow} emissiveIntensity={0.9} transparent opacity={0.78} /></mesh>)}
          <mesh><octahedronGeometry args={[0.24, 0]} /><meshBasicMaterial color={secondary} toneMapped={false} /></mesh>
          <pointLight color={glow} intensity={3.6} distance={5.4} />
        </group>
      ))}
      {Array.from({ length: 7 }, (_, index) => {
        const angle = index / 7 * Math.PI * 2;
        return <mesh key={index} position={[Math.cos(angle) * 4.55, 0.04, Math.sin(angle) * 4.55 - 0.25]} rotation={[-Math.PI / 2, 0, angle]}><ringGeometry args={[0.16, 0.28, 6]} /><meshBasicMaterial color={index % 2 ? secondary : glow} toneMapped={false} transparent opacity={0.76} depthWrite={false} /></mesh>;
      })}
    </group>
  );
}

function ChampionForge({ glow, secondary }: { glow: string; secondary: string }) {
  return (
    <group>
      {[-4.8, -2.7, 2.7, 4.8].map((x, index) => <GlowPool key={x} angular color={index % 2 ? secondary : glow} position={[x, -0.13, index % 2 ? -3.75 : -1.2]} scale={0.82} />)}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 4.75, 1.3, -4.55]}>
          <mesh castShadow rotation={[0, 0, side * -0.68]} scale={[0.8, 1.5, 0.8]}><coneGeometry args={[0.24, 1.65, 8]} /><meshStandardMaterial color="#8f6847" metalness={0.42} roughness={0.54} /></mesh>
          <mesh position={[side * -0.4, 0.28, 0]} scale={[0.8, 1.35, 0.8]}><coneGeometry args={[0.16, 0.82, 7]} /><meshBasicMaterial color={glow} toneMapped={false} /></mesh>
          <pointLight color={glow} intensity={4.2} distance={6} />
        </group>
      ))}
      <group position={[0, 3.62, -5.55]}>
        {[-2, -1, 0, 1, 2].map((index) => <mesh key={index} position={[index * 0.3, Math.abs(index) * -0.1, 0]}><coneGeometry args={[0.13, 0.62 - Math.abs(index) * 0.04, 6]} /><meshStandardMaterial color={index === 0 ? secondary : "#a0784c"} emissive={index === 0 ? glow : "#000000"} emissiveIntensity={0.72} /></mesh>)}
      </group>
    </group>
  );
}

function FrostArchive({ glow, secondary }: { glow: string; secondary: string }) {
  return (
    <group>
      {[-1, 1].map((side) => <group key={side} position={[side * 4.8, 0.72, -3.6]}><mesh scale={[0.78, 1.55, 0.78]}><octahedronGeometry args={[0.48, 0]} /><meshStandardMaterial color={secondary} emissive={glow} emissiveIntensity={0.52} transparent opacity={0.82} /></mesh><pointLight color={glow} intensity={2.8} distance={4.8} /></group>)}
      {[-3.5, 3.5].map((x) => <GlowPool key={x} angular color={glow} position={[x, -0.12, -1.2]} scale={0.68} />)}
    </group>
  );
}

function motifContent(motif: ArenaMotif, glow: string, secondary: string) {
  switch (motif) {
    case "ember-cellar": return <EmberCellar glow={glow} secondary={secondary} />;
    case "runic-bastion": return <RunicBastion glow={glow} />;
    case "storm-forge": return <StormForge glow={glow} secondary={secondary} />;
    case "toxic-laboratory": return <ToxicLaboratory glow={glow} secondary={secondary} />;
    case "stone-hearth": return <StoneHearth glow={glow} />;
    case "arcane-grandstand": return <ArcaneGrandstand glow={glow} secondary={secondary} />;
    case "champion-forge": return <ChampionForge glow={glow} secondary={secondary} />;
    case "frost-archive": return <FrostArchive glow={glow} secondary={secondary} />;
    case "moor-sanctum": return null;
  }
}

export function OpponentArenaIdentity({ opponentId, reactionKey, detail = 1 }: {
  opponentId: string;
  reactionKey: number;
  detail?: number;
}) {
  const presentation = getOpponentPresentation(opponentId);
  const motes = useRef<Group>(null);
  const lastReaction = useRef(reactionKey);
  const reactedAt = useRef(0);
  useFrame(({ clock }) => {
    if (lastReaction.current !== reactionKey) {
      lastReaction.current = reactionKey;
      reactedAt.current = clock.elapsedTime;
    }
    motes.current?.children.forEach((mote, index) => {
      const baseY = Number(mote.userData.baseY ?? 1);
      const reaction = Math.max(0, 1 - (clock.elapsedTime - reactedAt.current) * 3.2);
      mote.position.y = baseY + Math.sin(clock.elapsedTime * (0.8 + index * 0.04) + index) * (0.18 + reaction * 0.12);
      mote.rotation.x += 0.01 + index * 0.0004;
      mote.rotation.y += 0.015;
      mote.scale.setScalar(0.68 + Math.sin(clock.elapsedTime * 2 + index) * 0.2 + reaction * 0.32);
    });
  });
  if (presentation.arena === "moor-sanctum") return null;
  const count = Math.max(7, Math.round(13 * detail));
  return (
    <group>
      {motifContent(presentation.arena, presentation.glow, presentation.secondaryGlow)}
      <group ref={motes}>
        {Array.from({ length: count }, (_, index) => {
          const angle = index * 2.399;
          const radius = 3.3 + index % 5 * 0.72;
          const y = 0.5 + index % 6 * 0.44;
          return (
            <mesh key={index} position={[Math.cos(angle) * radius, y, -2.25 + Math.sin(angle) * 2.4]} userData={{ baseY: y }}>
              {presentation.signature === "rubble" ? <boxGeometry args={[0.07, 0.07, 0.07]} /> : presentation.signature === "venom" ? <sphereGeometry args={[0.045, 6, 5]} /> : <octahedronGeometry args={[0.045, 0]} />}
              <meshBasicMaterial color={index % 3 ? presentation.glow : presentation.secondaryGlow} toneMapped={false} transparent opacity={0.82} depthWrite={false} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
