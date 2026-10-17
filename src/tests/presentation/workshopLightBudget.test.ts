import { describe, expect, it, vi } from "vitest";
import { Group, PerspectiveCamera, PointLight, Scene } from "three";
import { installWorkshopLightBudget, WORKSHOP_DYNAMIC_LIGHT_CAPACITY } from "../../presentation/scene/workshopLightSlots";
import { installCombatLightBudget } from "../../presentation/scene/combatLightSlots";

function count(scene: Scene, camera: PerspectiveCamera) {
  let total = 0;
  scene.traverseVisible(n => { if (n instanceof PointLight && n.layers.test(camera.layers)) total++; });
  return total;
}

describe("workshop light-array stability", () => {
  it("covers menu, flight, landing, I–II, II–III, cascade, reserve and return", () => {
    const scene = new Scene(), camera = new PerspectiveCamera();
    scene.add(new PointLight(0xffaa77, 2));
    const dynamic = Array.from({ length: 9 }, (_, i) => {
      const light = new PointLight(0xff8844, 1.3, 2.4);
      light.userData[i === 8 ? "combatTransientLight" : "workshopDynamicLight"] = true;
      scene.add(light);
      return light;
    });
    const budget = installWorkshopLightBudget(scene, 1);
    // Six upgraded slots; two consumed inputs replace their board lights.
    // Output + aura + merge light bring the worst legal merge to nine.
    for (const active of [3, 0, 1, 0, 2, 3, 4, 5, 9, 6, 0]) {
      dynamic.forEach((light, i) => { light.visible = i < active; });
      budget.sync(camera);
      expect(count(scene, camera)).toBe(1 + WORKSHOP_DYNAMIC_LIGHT_CAPACITY);
      dynamic.forEach(light => {
        expect(light.intensity).toBe(1.3);
        expect(light.color.getHex()).toBe(0xff8844);
        expect(light.distance).toBe(2.4);
      });
    }
    budget.dispose();
  });
  it("respects animated parent visibility and camera layers", () => {
    const scene = new Scene(), camera = new PerspectiveCamera(), group = new Group();
    const light = new PointLight(0xffffff, 0);
    light.userData.workshopDynamicLight = true;
    group.add(light); scene.add(group);
    const budget = installWorkshopLightBudget(scene, 0);
    for (const visible of [true, false, true]) {
      group.visible = visible; budget.sync(camera);
      expect(count(scene, camera)).toBe(9);
    }
    light.layers.set(2); budget.sync(camera); expect(count(scene, camera)).toBe(9);
    camera.layers.set(2); budget.sync(camera); expect(count(scene, camera)).toBe(9);
    budget.dispose();
  });
  it("preserves callbacks, releases slots and does not leak into combat", () => {
    const scene = new Scene(), camera = new PerspectiveCamera(), previous = vi.fn();
    scene.onBeforeRender = previous;
    const budget = installWorkshopLightBudget(scene, 0);
    scene.onBeforeRender(null as never, scene, camera, null as never, null as never, null as never);
    expect(previous).toHaveBeenCalledOnce();
    expect(scene.children.every(n => n instanceof PointLight && n.intensity === 0 && !n.castShadow)).toBe(true);
    budget.dispose(); expect(scene.children).toHaveLength(0); expect(scene.onBeforeRender).toBe(previous);
    const combat = installCombatLightBudget(scene);
    combat.sync(camera); expect(count(scene, camera)).toBe(5);
    combat.dispose(); expect(scene.children).toHaveLength(0);
  });
  it("never removes a real light on future capacity overflow", () => {
    const scene = new Scene(), camera = new PerspectiveCamera();
    for (let i = 0; i < 10; i++) {
      const light = new PointLight(); light.userData.workshopDynamicLight = true; scene.add(light);
    }
    const budget = installWorkshopLightBudget(scene, 0);
    budget.sync(camera); expect(count(scene, camera)).toBe(10); budget.dispose();
  });
  it("reserves room-light slots before asynchronous assets have mounted", () => {
    const scene = new Scene(), camera = new PerspectiveCamera();
    const budget = installWorkshopLightBudget(scene, 6);
    for (let i = 0; i <= 6; i++) {
      budget.sync(camera); expect(count(scene, camera)).toBe(15);
      if (i < 6) scene.add(new PointLight(0xffaa44, 2));
    }
    budget.dispose(); expect(count(scene, camera)).toBe(6);
  });
});
