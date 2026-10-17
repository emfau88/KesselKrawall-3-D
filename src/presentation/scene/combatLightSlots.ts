import { Camera, PointLight, Scene } from "three";

// At most one ingredient event is presented at a time: pedestal + family aura +
// projectile + impact, with one additional light during the outcome flourish.
export const COMBAT_TRANSIENT_LIGHT_CAPACITY = 5;
const synchronizers = new WeakMap<Scene, (camera: Camera) => void>();

export function syncCombatLightSlots(scene: Scene, camera: Camera) {
  synchronizers.get(scene)?.(camera);
}

/** Keep the shader's light-array length stable without changing any light energy. */
export function installCombatLightBudget(scene: Scene) {
  const padding = Array.from({ length: COMBAT_TRANSIENT_LIGHT_CAPACITY }, () => {
    const light = new PointLight(0x000000, 0);
    light.name = "combat-unused-light-slot";
    light.castShadow = false;
    return light;
  });
  scene.add(...padding);
  function sync(camera: Camera) {
    let active = 0;
    scene.traverseVisible(node => {
      if (node instanceof PointLight && node.userData.combatTransientLight && node.layers.test(camera.layers)) active++;
    });
    // Overflow never removes a real light. The bounded normal path is covered
    // by tests and the benchmark; a future new effect can expand this contract.
    const unused = Math.max(0, COMBAT_TRANSIENT_LIGHT_CAPACITY - active);
    for (const [index, light] of padding.entries()) {
      light.layers.mask = camera.layers.mask;
      light.visible = index < unused;
    }
  }
  const previous = scene.onBeforeRender;
  const beforeRender: typeof scene.onBeforeRender = function (this: Scene, ...args) {
    previous.apply(this, args);
    sync(args[2]);
  };
  scene.onBeforeRender = beforeRender;
  synchronizers.set(scene, sync);
  return {
    sync,
    dispose() {
      if (scene.onBeforeRender === beforeRender) scene.onBeforeRender = previous;
      if (synchronizers.get(scene) === sync) synchronizers.delete(scene);
      scene.remove(...padding);
      for (const light of padding) light.dispose();
    },
  };
}
