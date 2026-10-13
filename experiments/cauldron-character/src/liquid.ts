import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  Points,
  PointsMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import type { CharacterPose } from "./animation";

function createSteamTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const context = canvas.getContext("2d")!;
  const glow = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  glow.addColorStop(0, "rgba(255,255,255,.8)");
  glow.addColorStop(0.4, "rgba(255,255,255,.35)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 32, 32);
  return new CanvasTexture(canvas);
}

// Effects allocate their geometry and particles once. Every frame reuses buffers.
export class LivingLiquid {
  private readonly material = new MeshPhysicalMaterial({
    color: 0x07534f,
    emissive: 0x17cba8,
    emissiveIntensity: 0.32,
    metalness: 0.05,
    roughness: 0.3,
    clearcoat: 0.24,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.16,
    specularIntensity: 0.42,
    side: DoubleSide,
  });
  private readonly bubbleMaterial = new MeshPhysicalMaterial({
    color: 0x37eccb,
    emissive: 0x38d9b1,
    emissiveIntensity: 0.18,
    roughness: 0.12,
    metalness: 0.2,
    transparent: true,
    opacity: 0.65,
    clearcoat: 1,
    depthWrite: false,
  });
  private readonly steamMaterial = new PointsMaterial({
    color: 0x83cbb8,
    size: 0.075,
    map: createSteamTexture(),
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    sizeAttenuation: true,
  });
  private readonly bubbleGeometry = new SphereGeometry(1, 8, 6);
  private readonly bubbleCount = 24;
  private readonly steamCount = 44;
  private readonly bubbles = new InstancedMesh(
    this.bubbleGeometry,
    this.bubbleMaterial,
    this.bubbleCount,
  );
  private readonly steamGeometry = new BufferGeometry();
  private readonly steamPositions = new Float32Array(this.steamCount * 3);
  private readonly steam: Points;
  private readonly group = new Group();
  private readonly dummy = new Object3D();
  private readonly baseline: Float32Array;
  private readonly positions: BufferAttribute;
  private readonly normals: BufferAttribute;
  private readonly geometry: BufferGeometry;
  private readonly surfacePosition = new Vector3();
  private readonly radius: number;
  private readonly initialMaterial;
  private readonly initialGeometry;
  private readonly glowColor = new Color(0x17cba8);
  private readonly timeUniform = { value: 0 };
  private readonly radiusUniform = { value: 0.28 };
  private readonly diagnosticUniform = { value: 0 };

  constructor(
    private readonly surface: Mesh,
    attach: Object3D,
  ) {
    this.initialMaterial = surface.material;
    this.initialGeometry = surface.geometry;
    this.geometry = surface.geometry.clone();
    surface.geometry = this.geometry;
    this.positions = this.geometry.getAttribute("position") as BufferAttribute;
    this.normals = this.geometry.getAttribute("normal") as BufferAttribute;
    this.positions.setUsage(DynamicDrawUsage);
    this.normals.setUsage(DynamicDrawUsage);
    this.baseline = new Float32Array(this.positions.array);
    this.geometry.computeBoundingBox();
    const extent = this.geometry.boundingBox!;
    this.radius =
      Math.max(extent.max.x - extent.min.x, extent.max.z - extent.min.z) * 0.5;
    this.radiusUniform.value = this.radius;
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.potionTime = this.timeUniform;
      shader.uniforms.potionRadius = this.radiusUniform;
      shader.uniforms.potionDiagnostic = this.diagnosticUniform;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vPotionLocal;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvPotionLocal = position;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec3 vPotionLocal;
          uniform float potionTime;
          uniform float potionRadius;
          uniform float potionDiagnostic;`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          float potionR = length(vPotionLocal.xz) / potionRadius;
          float potionAngle = atan(vPotionLocal.z, vPotionLocal.x);
          float potionSpiral = sin(potionR * 24.0 + potionAngle * 3.0 - potionTime * 1.15);
          float potionFoam = smoothstep(0.90, 0.99, potionSpiral)
            * smoothstep(0.12, 0.38, potionR) * (1.0 - smoothstep(0.77, 1.0, potionR));
          if (potionDiagnostic < 0.5) {
            diffuseColor.rgb *= 0.75 + 0.25 * potionSpiral;
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.32, 0.23), potionFoam * 0.30);
          }`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          if (potionDiagnostic < 0.5) {
            totalEmissiveRadiance *= 0.68 + 0.20 * potionSpiral + 0.12 * potionFoam;
          }`,
        );
    };
    this.material.customProgramCacheKey = () => "brasskin-living-potion-v1";
    surface.material = this.material;
    surface.name = "LiquidSurface";
    surface.castShadow = false;
    surface.receiveShadow = true;
    // World-to-parent conversion preserves exported local origin/scale exactly.
    surface.updateWorldMatrix(true, false);
    attach.updateWorldMatrix(true, false);
    surface.getWorldPosition(this.surfacePosition);
    attach.worldToLocal(this.surfacePosition);
    this.group.name = "LiquidEffects";
    this.group.position.copy(this.surfacePosition);
    this.group.scale.copy(surface.scale);
    attach.add(this.group);
    this.bubbles.name = "ReusablePotionBubbles";
    this.bubbles.instanceMatrix.setUsage(DynamicDrawUsage);
    this.bubbles.frustumCulled = false;
    this.group.add(this.bubbles);
    this.steamGeometry.setAttribute(
      "position",
      new BufferAttribute(this.steamPositions, 3).setUsage(DynamicDrawUsage),
    );
    this.steam = new Points(this.steamGeometry, this.steamMaterial);
    this.steam.name = "ReusablePotionSteam";
    this.steam.frustumCulled = false;
    this.group.add(this.steam);
  }

  update(time: number, pose: CharacterPose, reducedMotion: boolean) {
    const t = time;
    this.timeUniform.value = reducedMotion ? time * 0.35 : time;
    const intensity = pose.liquidEnergy * (reducedMotion ? 0.4 : 1);
    for (let i = 0; i < this.positions.count; i++) {
      const x = this.baseline[i * 3]!;
      const y = this.baseline[i * 3 + 1]!;
      const z = this.baseline[i * 3 + 2]!;
      const distance = Math.hypot(x, z);
      const edge =
        1 - MathUtils.smoothstep(distance, this.radius * 0.72, this.radius);
      const wave =
        Math.sin(x * 23 + t * 2.4) * 0.004 + Math.cos(z * 20 - t * 2.2) * 0.004;
      const swirl =
        Math.sin(Math.atan2(z, x) * 3 + distance * 21 - t * 3.4) * 0.003;
      this.positions.setY(i, y + (wave + swirl) * edge * intensity);
      const dx = Math.cos(x * 23 + t * 2.4) * 0.092 * edge * intensity;
      const dz = -Math.sin(z * 20 - t * 2.2) * 0.08 * edge * intensity;
      const normalLength = Math.sqrt(dx * dx + 1 + dz * dz);
      this.normals.setXYZ(
        i,
        -dx / normalLength,
        1 / normalLength,
        -dz / normalLength,
      );
    }
    this.positions.needsUpdate = true;
    this.normals.needsUpdate = true;
    this.material.emissive.copy(this.glowColor);
    this.material.emissiveIntensity = 0.22 + pose.glow * 0.22;
    this.bubbleMaterial.emissiveIntensity = 0.1 + pose.glow * 0.1;
    this.steamMaterial.opacity = 0.06 + pose.energy * 0.16;
    for (let i = 0; i < this.bubbleCount; i++) {
      const phase = (t * (0.2 + (i % 5) * 0.031) * intensity + i * 0.3819) % 1;
      const angle = i * 2.39996 + t * 0.13;
      const radial = this.radius * (0.12 + ((i * 0.173) % 0.75));
      const scale =
        (0.009 + (i % 4) * 0.0029) *
        Math.sin(phase * Math.PI) *
        Math.min(1, pose.energy * 1.6);
      const splashOffset =
        i < 8
          ? pose.splash * (0.045 + (i % 3) * 0.02) * (reducedMotion ? 0.25 : 1)
          : 0;
      this.dummy.position.set(
        Math.cos(angle) * radial,
        phase * 0.045 + splashOffset - 0.011,
        Math.sin(angle) * radial,
      );
      this.dummy.scale.setScalar(Math.max(0.00001, scale));
      this.dummy.updateMatrix();
      this.bubbles.setMatrixAt(i, this.dummy.matrix);
    }
    this.bubbles.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < this.steamCount; i++) {
      const phase = (t * 0.15 + i * 0.3819) % 1;
      const angle = i * 2.39996 + phase * 1.6;
      const radial = this.radius * 0.65 * ((i * 0.123) % 1);
      this.steamPositions[i * 3] =
        Math.cos(angle) * radial + Math.sin(t + i) * phase * 0.022;
      this.steamPositions[i * 3 + 1] = 0.01 + phase * 0.23 * pose.energy;
      this.steamPositions[i * 3 + 2] = Math.sin(angle) * radial;
    }
    this.steamGeometry.attributes.position!.needsUpdate = true;
  }

  setDiagnosticRed(enabled: boolean) {
    this.material.color.setHex(enabled ? 0xff0000 : 0x07534f);
    this.glowColor.setHex(enabled ? 0xff0000 : 0x17cba8);
    this.material.envMapIntensity = enabled ? 0 : 0.16;
    this.material.clearcoat = enabled ? 0 : 0.24;
    this.material.roughness = enabled ? 1 : 0.3;
    this.diagnosticUniform.value = enabled ? 1 : 0;
  }

  dispose() {
    this.group.removeFromParent();
    this.surface.geometry = this.initialGeometry;
    this.surface.material = this.initialMaterial;
    this.geometry.dispose();
    this.material.dispose();
    this.bubbleGeometry.dispose();
    this.bubbleMaterial.dispose();
    this.steamGeometry.dispose();
    this.steamMaterial.map?.dispose();
    this.steamMaterial.dispose();
  }
}
