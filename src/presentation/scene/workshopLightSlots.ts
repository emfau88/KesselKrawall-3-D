import { Camera, PointLight, Scene } from "three";

// Five board slots + one reserve, plus merge output, aura and merge light.
// Input lights replace the consumed board lights; they are not additional.
export const WORKSHOP_DYNAMIC_LIGHT_CAPACITY = 9;

/** Stabilize the workshop light array, including lights below animated groups.
 * Real lights retain their exact colour, intensity, range and shadow settings.
 * This is deliberately separate from the arena's five transient-light slots.
 */
export function installWorkshopLightBudget(scene: Scene, roomCapacity: number) {
  // Room lights also arrive incrementally through existing Suspense boundaries.
  // Reserve their slots from the first frame, not just ingredient/effect slots.
  const capacity = roomCapacity + WORKSHOP_DYNAMIC_LIGHT_CAPACITY;
  const padding = Array.from({ length: capacity }, () => {
    const light = new PointLight(0x000000, 0);
    light.name = "workshop-unused-light-slot";
    light.castShadow = false;
    return light;
  });
  scene.add(...padding);
  function sync(camera: Camera) {
    let active = 0;
    scene.traverseVisible(node => {
      if (node instanceof PointLight && !padding.includes(node) && node.layers.test(camera.layers)) active++;
    });
    const unused = Math.max(0, capacity - active);
    padding.forEach((light, index) => {
      light.layers.mask = camera.layers.mask;
      light.visible = index < unused;
    });
  }
  const previous = scene.onBeforeRender;
  const beforeRender: typeof scene.onBeforeRender = function (this: Scene, ...args) {
    previous.apply(this, args);
    sync(args[2]);
  };
  scene.onBeforeRender = beforeRender;
  return {
    sync,
    dispose() {
      if (scene.onBeforeRender === beforeRender) scene.onBeforeRender = previous;
      scene.remove(...padding);
      padding.forEach(light => light.dispose());
    },
  };
}
