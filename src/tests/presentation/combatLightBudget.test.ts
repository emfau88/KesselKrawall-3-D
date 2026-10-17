import { describe, expect, it, vi } from "vitest";
import { Group, PerspectiveCamera, PointLight, Scene } from "three";
import { COMBAT_TRANSIENT_LIGHT_CAPACITY, installCombatLightBudget } from "../../presentation/scene/combatLightSlots";

function visiblePoints(scene: Scene, camera: PerspectiveCamera) {
  let count = 0;
  scene.traverseVisible(node => { if (node instanceof PointLight && node.layers.test(camera.layers)) count++; });
  return count;
}

describe("combat light-array stability", () => {
  it("preserves visible array length through cast, flight, overlap, impact and outcome", () => {
    const scene = new Scene(), camera = new PerspectiveCamera();
    scene.add(new PointLight(0xffaa77, 2));
    const transient = Array.from({length: 5}, () => {const light = new PointLight(0xff8844, 1.3, 2.4);light.userData.combatTransientLight = true;scene.add(light);return light;});
    const budget = installCombatLightBudget(scene);
    for (const active of [0, 2, 3, 4, 3, 2, 5, 0]) {
      transient.forEach((light, index) => {light.visible = index < active;});
      budget.sync(camera);
      expect(visiblePoints(scene, camera)).toBe(1 + COMBAT_TRANSIENT_LIGHT_CAPACITY);
      for (const light of transient) {expect(light.intensity).toBe(1.3);expect(light.distance).toBe(2.4);expect(light.color.getHex()).toBe(0xff8844);}
    }
    budget.dispose();
  });
  it("respects parent visibility and camera layers, including zero-intensity real lights", () => {
    const scene = new Scene(), camera = new PerspectiveCamera(), group = new Group();scene.add(group);
    const light = new PointLight(0xffffff, 0);light.userData.combatTransientLight = true;group.add(light);
    const budget = installCombatLightBudget(scene);
    for (const hidden of [true,false]) {group.visible = !hidden;budget.sync(camera);expect(visiblePoints(scene,camera)).toBe(5);}
    light.layers.set(2);budget.sync(camera);expect(visiblePoints(scene,camera)).toBe(5);
    camera.layers.set(2);budget.sync(camera);expect(visiblePoints(scene,camera)).toBe(5);
    budget.dispose();
  });
  it("keeps the prior scene callback and releases the slots on unmount", () => {
    const scene = new Scene(), camera = new PerspectiveCamera(), prior = vi.fn();scene.onBeforeRender = prior;
    const budget = installCombatLightBudget(scene);
    scene.onBeforeRender(null as never, scene, camera, null as never, null as never, null as never);
    expect(prior).toHaveBeenCalledOnce();expect(visiblePoints(scene,camera)).toBe(5);
    expect(scene.children.every(node => node instanceof PointLight && node.intensity === 0 && !node.castShadow)).toBe(true);
    budget.dispose();expect(scene.onBeforeRender).toBe(prior);expect(scene.children).toHaveLength(0);
  });
  it("never hides a real light if a future effect exceeds the documented capacity", () => {
    const scene = new Scene(), camera = new PerspectiveCamera();
    for(let i=0;i<6;i++){const light=new PointLight();light.userData.combatTransientLight=true;scene.add(light);}
    const budget=installCombatLightBudget(scene);budget.sync(camera);expect(visiblePoints(scene,camera)).toBe(6);budget.dispose();
  });
});
