import {
  ACESFilmicToneMapping,
  AmbientLight,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  TorusGeometry,
  WebGLRenderer,
} from "three";
import type { Material, Object3D, Texture } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { CharacterAnimator, moodLabels, moods } from "./animation";
import type { Mood } from "./animation";
import { LivingLiquid } from "./liquid";
import "./style.css";

type Variant = "desktop" | "mobile";
type View = "front" | "rear" | "three-quarter";
const byId = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing UI element: ${id}`);
  return element as T;
};
const canvas = byId<HTMLCanvasElement>("scene");
const status = byId("load-status");
const badge = byId("ready-badge");
const autoDemo = byId<HTMLInputElement>("auto-demo");
const reducedMotion = byId<HTMLInputElement>("reduced-motion");
const assetQuality = byId<HTMLSelectElement>("asset-quality");
const pauseButton = byId<HTMLButtonElement>("pause");
const moodCaption = byId("mood-caption");
const query = new URLSearchParams(location.search);
const narrow = matchMedia(
  "(max-width: 720px), (max-width: 1000px) and (max-height: 500px)",
);
const preference = matchMedia("(prefers-reduced-motion: reduce)");
reducedMotion.checked = preference.matches;
const initialQuality = query.get("quality");
if (initialQuality === "desktop" || initialQuality === "mobile")
  assetQuality.value = initialQuality;

const scene = new Scene();
scene.background = new Color(0x151b1e);
scene.fog = new Fog(0x151b1e, 12, 30);
const camera = new PerspectiveCamera(34, 1, 0.05, 70);
camera.position.set(4.4, 2.95, 7.0);
const renderer = new WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, narrow.matches ? 1.5 : 2));
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.03;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.24, 0);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 4.3;
controls.maxDistance = 13;
controls.minPolarAngle = 0.3;
controls.maxPolarAngle = Math.PI * 0.49;
controls.update();

const pmrem = new PMREMGenerator(renderer);
const room = new RoomEnvironment();
const environment = pmrem.fromScene(room, 0.04);
scene.environment = environment.texture;
scene.environmentIntensity = 0.7;
room.dispose();
pmrem.dispose();

scene.add(new AmbientLight(0x98c8cf, 0.12));
const key = new DirectionalLight(0xffe0b2, 3.2);
key.position.set(-3, 5.2, 5);
key.castShadow = true;
key.shadow.mapSize.set(
  narrow.matches ? 1024 : 2048,
  narrow.matches ? 1024 : 2048,
);
key.shadow.camera.left = -4;
key.shadow.camera.right = 4;
key.shadow.camera.top = 5;
key.shadow.camera.bottom = -4;
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 18;
key.shadow.bias = -0.0003;
key.shadow.normalBias = 0.025;
scene.add(key);
const fill = new DirectionalLight(0x96bada, 1.3);
fill.position.set(4, 2.5, 4);
scene.add(fill);
const rim = new DirectionalLight(0x63e3cd, 2.5);
rim.position.set(1, 4, -3);
scene.add(rim);
const potionLight = new PointLight(0x34ebc4, 1, 4, 2);
potionLight.position.set(0, 2.15, 0);
scene.add(potionLight);

const floor = new Mesh(
  new PlaneGeometry(80, 80),
  new MeshStandardMaterial({
    color: 0x202a2d,
    roughness: 0.86,
    metalness: 0.08,
  }),
);
floor.rotation.x = -Math.PI * 0.5;
floor.position.y = -0.12;
floor.receiveShadow = true;
scene.add(floor);
const plinth = new Mesh(
  new CylinderGeometry(1.66, 1.7, 0.1, 80),
  new MeshStandardMaterial({
    color: 0x283d3d,
    roughness: 0.46,
    metalness: 0.2,
  }),
);
plinth.position.y = -0.055;
plinth.receiveShadow = true;
scene.add(plinth);
const trim = new Mesh(
  new TorusGeometry(1.66, 0.009, 6, 100),
  new MeshStandardMaterial({
    color: 0x927b48,
    roughness: 0.36,
    metalness: 0.7,
  }),
);
trim.rotation.x = -Math.PI * 0.5;
trim.position.y = 0.001;
scene.add(trim);
const contact = new Mesh(
  new CircleGeometry(1.64, 64),
  new ShadowMaterial({ opacity: 0.26 }),
);
contact.rotation.x = -Math.PI * 0.5;
contact.position.y = 0.004;
contact.receiveShadow = true;
scene.add(contact);
const modelMount = new Group();
modelMount.name = "CharacterStageMount";
modelMount.scale.setScalar(3);
scene.add(modelMount);

const loader = new GLTFLoader();
let model: Object3D | null = null;
let animator: CharacterAnimator | null = null;
let liquid: LivingLiquid | null = null;
let ready = false;
let error: string | null = null;
let variant: Variant = narrow.matches ? "mobile" : "desktop";
let loadGeneration = 0;
let mood: Mood = "idle";
let time = 0;
let paused = false;
let gazeX = 0;
let gazeY = 0;
let currentView: View = "three-quarter";
let lastFrame = performance.now();
let lastMetrics = 0;
let demoTime = 0;
let renderDirty = true;
let frames = 0;
const cadenceSamples = new Float32Array(180);
const cpuSamples = new Float32Array(180);
let sampleCount = 0;
let sampleIndex = 0;
const metricSort = new Float32Array(180);
let frameAverage = 0;
let frameP95 = 0;
let cpuAverage = 0;
let cpuP95 = 0;
const glowMaterials: { material: MeshStandardMaterial; baseline: number }[] =
  [];

function disposeModel(root: Object3D) {
  const geometries = new Set<Mesh["geometry"]>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material)
      ? node.material
      : [node.material]) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value && typeof value === "object" && "isTexture" in value)
          textures.add(value as Texture);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
}

function setEnabled(enabled: boolean) {
  for (const element of document.querySelectorAll<HTMLButtonElement>(
    "[data-state], #replay, #pause",
  ))
    element.disabled = !enabled;
}

async function loadCharacter() {
  const generation = ++loadGeneration;
  ready = false;
  error = null;
  setEnabled(false);
  status.className = "scene-status";
  status.setAttribute("role", "status");
  status.textContent = "Kessel wird vorbereitet …";
  badge.className = "ready-badge";
  badge.textContent = "Lädt";
  variant =
    assetQuality.value === "auto"
      ? narrow.matches
        ? "mobile"
        : "desktop"
      : (assetQuality.value as Variant);
  byId("metric-asset").textContent =
    variant === "mobile" ? "Mobile" : "Desktop";
  liquid?.dispose();
  liquid = null;
  animator = null;
  if (model) {
    model.removeFromParent();
    disposeModel(model);
    model = null;
  }
  glowMaterials.length = 0;
  try {
    const gltf = await loader.loadAsync(
      `${import.meta.env.BASE_URL}assets/characters/brasskin/brasskin-${variant}.glb`,
    );
    if (generation !== loadGeneration) {
      disposeModel(gltf.scene);
      return;
    }
    model = gltf.scene;
    modelMount.add(model);
    const namedRoot = model.getObjectByName("CharacterRoot") ?? model;
    const required = ["CharacterRoot", "Body", "LiquidRoot", "LiquidSurface"];
    const missing = required.filter((name) => !model!.getObjectByName(name));
    if (missing.length)
      throw new Error(`Charakterstruktur fehlt: ${missing.join(", ")}`);
    model.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      node.castShadow = !node.name.startsWith("Liquid");
      node.receiveShadow = true;
      if (node.name === "CharmGlow") {
        for (const material of Array.isArray(node.material)
          ? node.material
          : [node.material]) {
          if (material instanceof MeshStandardMaterial)
            glowMaterials.push({
              material,
              baseline: material.emissiveIntensity || 0.6,
            });
        }
      }
    });
    const surface = model.getObjectByName("LiquidSurface");
    if (!(surface instanceof Mesh))
      throw new Error("Die Flüssigkeitsoberfläche ist kein separates Mesh.");
    const faceMesh = model.getObjectByName("Body");
    if (!(faceMesh instanceof Mesh) || !faceMesh.morphTargetDictionary)
      throw new Error("Gesichtsmorphs fehlen: Body");
    const requiredMorphs = [
      "Blink_L",
      "Blink_R",
      "Smile",
      "Surprise",
      "Hurt",
      "Look_L",
      "Look_R",
    ];
    if (
      requiredMorphs.some(
        (name) => faceMesh.morphTargetDictionary?.[name] === undefined,
      )
    )
      throw new Error("Die originalen Gesichtsmorphs sind unvollständig.");
    animator = new CharacterAnimator(namedRoot);
    liquid = new LivingLiquid(surface, namedRoot);
    time = 0;
    demoTime = 0;
    applyPose();
    status.textContent = "Materialien und Schatten werden vorbereitet …";
    // State controls become active only after model, face, liquid and shaders exist.
    await renderer.compileAsync(scene, camera);
    if (generation !== loadGeneration) return;
    renderer.render(scene, camera);
    ready = true;
    status.textContent = "Brasskin ist bereit";
    status.className = "scene-status ready";
    badge.className = "ready-badge ready";
    badge.textContent = "Bereit";
    setEnabled(true);
  } catch (reason) {
    if (generation !== loadGeneration) return;
    error = reason instanceof Error ? reason.message : String(reason);
    if (model) {
      liquid?.dispose();
      liquid = null;
      model.removeFromParent();
      disposeModel(model);
      model = null;
    }
    animator = null;
    status.className = "scene-status error";
    status.setAttribute("role", "alert");
    status.textContent = "Der Kessel konnte nicht geladen werden. ";
    const retry = document.createElement("button");
    retry.id = "retry-load";
    retry.textContent = "Erneut versuchen";
    retry.addEventListener("click", () => void loadCharacter());
    status.append(retry);
    badge.className = "ready-badge error";
    badge.textContent = "Ladefehler";
    console.error("Character preview:", error);
  }
}

function selectState(next: string) {
  if (!(moods as readonly string[]).includes(next))
    throw new Error(`Unknown character state: ${next}`);
  mood = next as Mood;
  time = 0;
  demoTime = 0;
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-state]",
  )) {
    const selected = button.dataset.state === mood;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
  moodCaption.textContent = moodLabels[mood];
  applyPose();
  renderDirty = true;
}

function applyPose() {
  if (!animator || !liquid) return;
  const pose = animator.apply(mood, time, reducedMotion.checked, gazeX, gazeY);
  liquid.update(time, pose, reducedMotion.checked);
  potionLight.intensity = 0.35 + pose.glow * 0.65;
  for (const { material, baseline } of glowMaterials)
    material.emissiveIntensity = baseline * (0.6 + pose.glow * 0.4);
}

function setView(view: View) {
  currentView = view;
  const compact = narrow.matches;
  const distance = compact ? 8.6 : 7.8;
  const angle =
    view === "front" ? 0 : view === "rear" ? Math.PI : Math.PI * 0.19;
  camera.position.set(
    Math.sin(angle) * distance,
    compact ? 4.9 : 4.8,
    Math.cos(angle) * distance,
  );
  controls.target.set(0, compact ? 1.18 : 1.24, 0);
  controls.update();
  renderDirty = true;
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-view]",
  )) {
    const selected = button.dataset.view === view;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
}

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderDirty = true;
}

const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(canvas.parentElement!);
narrow.addEventListener("change", () => {
  renderer.setPixelRatio(Math.min(devicePixelRatio, narrow.matches ? 1.5 : 2));
  setView(currentView);
  resize();
  if (assetQuality.value === "auto") void loadCharacter();
});
preference.addEventListener("change", () => {
  reducedMotion.checked = preference.matches;
});
canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  gazeX = MathUtils.clamp(
    ((event.clientX - rect.left) / rect.width - 0.5) * 2,
    -1,
    1,
  );
  gazeY = MathUtils.clamp(
    (0.5 - (event.clientY - rect.top) / rect.height) * 2,
    -1,
    1,
  );
});
canvas.addEventListener("pointerleave", () => {
  gazeX = 0;
  gazeY = 0;
});
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-state]",
))
  button.addEventListener("click", () => selectState(button.dataset.state!));
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-view]",
))
  button.addEventListener("click", () => setView(button.dataset.view as View));
byId("replay").addEventListener("click", () => selectState(mood));
pauseButton.addEventListener("click", () => {
  paused = !paused;
  pauseButton.textContent = paused ? "▷ Weiter" : "Ⅱ Pause";
  pauseButton.setAttribute("aria-pressed", String(paused));
});
assetQuality.addEventListener("change", () => void loadCharacter());

function sampleMetrics(samples: Float32Array) {
  let sum = 0;
  for (let i = 0; i < sampleCount; i++) {
    metricSort[i] = samples[i]!;
    sum += samples[i]!;
  }
  const sorted = metricSort.subarray(0, sampleCount).sort();
  return {
    mean: sampleCount ? sum / sampleCount : 0,
    p95: sorted[Math.max(0, Math.ceil(sampleCount * 0.95) - 1)] ?? 0,
  };
}

function updateMetrics() {
  const cadence = sampleMetrics(cadenceSamples);
  const cpu = sampleMetrics(cpuSamples);
  frameAverage = cadence.mean;
  frameP95 = cadence.p95;
  cpuAverage = cpu.mean;
  cpuP95 = cpu.p95;
  byId("metric-render").textContent =
    `${renderer.info.render.triangles.toLocaleString("de-DE")} / ${renderer.info.render.calls}`;
  byId("metric-cadence").textContent =
    `${frameAverage.toFixed(1)} / ${frameP95.toFixed(1)} ms`;
  byId("metric-cpu").textContent =
    `${cpuAverage.toFixed(1)} / ${cpuP95.toFixed(1)} ms`;
  byId("metric-textures").textContent = String(renderer.info.memory.textures);
}

function frame(now: number) {
  requestAnimationFrame(frame);
  const start = performance.now();
  const deltaMs = now - lastFrame;
  lastFrame = now;
  if (document.hidden) return;
  const dt = Math.min(deltaMs / 1000, 0.05);
  if (ready && !paused) {
    time += dt;
    if (autoDemo.checked) {
      demoTime += dt;
      if (demoTime > 5.1)
        selectState(moods[(moods.indexOf(mood) + 1) % moods.length]!);
    }
    applyPose();
  }
  const cameraChanged = controls.update();
  if (!paused || cameraChanged || renderDirty) {
    renderer.render(scene, camera);
    frames++;
    renderDirty = false;
  }
  if (ready && !paused && deltaMs > 0 && deltaMs < 250) {
    cadenceSamples[sampleIndex] = deltaMs;
    cpuSamples[sampleIndex] = performance.now() - start;
    sampleIndex = (sampleIndex + 1) % cadenceSamples.length;
    sampleCount = Math.min(sampleCount + 1, cadenceSamples.length);
  }
  if (now - lastMetrics > 1000) {
    lastMetrics = now;
    updateMetrics();
  }
}

function snapshot() {
  const meshNames: string[] = [];
  const meshVisibility: Record<string, boolean> = {};
  const faceMorphs: Record<string, number> = {};
  let triangleCount = 0;
  let liquidSurfaceCount = 0;
  model?.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    meshNames.push(node.name);
    meshVisibility[node.name] = node.visible;
    triangleCount += node.geometry.index
      ? node.geometry.index.count / 3
      : node.geometry.attributes.position!.count / 3;
    if (node.name === "LiquidSurface") liquidSurfaceCount++;
    if (node.name === "Body" && node.morphTargetDictionary) {
      for (const [name, index] of Object.entries(node.morphTargetDictionary))
        faceMorphs[name] = node.morphTargetInfluences?.[index] ?? 0;
    }
  });
  return {
    ready,
    variant,
    expression: mood,
    state: mood,
    time,
    paused,
    reducedMotion: reducedMotion.checked,
    view: currentView,
    error,
    triangleCount,
    meshNames,
    sceneMeshNames: meshNames,
    meshVisibility,
    faceMorphs: { Body: faceMorphs },
    liquidSurfaceCount,
    frames,
    pose: animator ? { ...animator.pose } : null,
    render: {
      triangles: renderer.info.render.triangles,
      calls: renderer.info.render.calls,
      textures: renderer.info.memory.textures,
    },
    performance: {
      frameAverageMs: frameAverage,
      frameP95Ms: frameP95,
      cpuAverageMs: cpuAverage,
      cpuP95Ms: cpuP95,
      samples: sampleCount,
    },
    canvas: {
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      pixelRatio: renderer.getPixelRatio(),
    },
  };
}

const review = Object.freeze({
  snapshot,
  selectState,
  setExpression: selectState,
  diagnoseLiquid(showBody: boolean, diagnosticRed: boolean) {
    const body = model?.getObjectByName("Body");
    if (body) body.visible = showBody;
    liquid?.setDiagnosticRed(diagnosticRed);
    applyPose();
    renderer.render(scene, camera);
    return snapshot();
  },
  seek(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0)
      throw new Error("Seek requires a finite positive time.");
    paused = true;
    pauseButton.textContent = "▷ Weiter";
    pauseButton.setAttribute("aria-pressed", "true");
    time = seconds;
    applyPose();
    controls.update();
    renderer.render(scene, camera);
    return snapshot();
  },
  setView,
  async selectAsset(next: Variant) {
    assetQuality.value = next;
    await loadCharacter();
    return snapshot();
  },
});
Object.defineProperty(window, "__CAULDRON_REVIEW__", {
  value: review,
  configurable: false,
  writable: false,
});

selectState("idle");
setView((query.get("view") as View) || "three-quarter");
resize();
requestAnimationFrame(frame);
void loadCharacter();
