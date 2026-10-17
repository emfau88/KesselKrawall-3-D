// Isolated-browser instrumentation. No production hooks or game-rule changes.
export function installWorkshopProbe({ constantLights = 0 } = {}) {
  const probe = window.__combatProbe;
  const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  const original = hook.onCommitFiberRoot;
  const data = { commits: [], purchases: [], scenes: [], timers: [] };
  const originalTimeout = window.setTimeout;
  window.setTimeout = function (callback, duration, ...args) {
    if (typeof callback !== 'function' || ![680, 180, 620, 260, 140, 90].includes(duration)) return originalTimeout.call(this, callback, duration, ...args);
    const timer = { created: performance.now(), duration, fired: null };
    data.timers.push(timer);
    return originalTimeout.call(this, (...callbackArgs) => { timer.fired = performance.now(); return callback(...callbackArgs); }, duration, ...args);
  };
  let signature = '', lastMetrics = 0;
  let paddedScene;
  function inspect(root) {
    const queue = [root.current];
    while (queue.length) {
      const n = queue.pop();
      if (!n) continue;
      let game, purchase;
      for (let h = n.memoizedState; h && h.memoizedState !== undefined; h = h.next) {
        const value = h.memoizedState;
        if (value?.version === 1 && Array.isArray(value.board)) game = value;
        if (value?.beforeBoard && value?.afterBoard && value?.phase) purchase = value;
      }
      if (game) {
        const phase = purchase ? `${purchase.id}:${purchase.phase}:${purchase.mergeStepIndex}` : 'idle';
        const t = performance.now();
        data.commits.push({ t, phase, gamePhase: game.phase });
        if (phase !== signature) {
          signature = phase;
          const event = { t, phase, purchase: purchase ? structuredClone(purchase) : null };
          data.purchases.push(event);
          probe.mark(`purchase-phase:${phase}`, { phase: purchase?.phase ?? 'idle', step: purchase?.mergeStepIndex });
        }
        return;
      }
      if (n.child) queue.push(n.child);
      if (n.sibling) queue.push(n.sibling);
    }
  }
  hook.onCommitFiberRoot = function (id, root, ...rest) {
    original.call(this, id, root, ...rest);
    inspect(root);
  };
  function sample(t) {
    const state = probe.state();
    if (constantLights && state && paddedScene !== state.scene) {
      const scene = state.scene;
      let template; scene.traverse(n => { if (n.isPointLight && !template) template = n; });
      if (template) {
        paddedScene = scene;
        const slots = Array.from({ length: constantLights }, () => { const p = new template.constructor(0, 0); p.userData.workshopExperiment = true; return p; });
        scene.add(...slots);
        const previous = scene.onBeforeRender;
        scene.onBeforeRender = function (...args) {
          previous.apply(this, args);
          let real = 0; scene.traverseVisible(n => { if (n.isPointLight && !n.userData.workshopExperiment) real++; });
          slots.forEach((p, i) => { p.visible = i < Math.max(0, constantLights - real); });
        };
      }
    }
    if (state && t - lastMetrics > 100) {
      lastMetrics = t;
      let lights = 0, assets = 0, ingredients = 0;
      state.scene.traverseVisible(n => {
        if (n.isPointLight) lights++;
        if (n.userData.productionAsset || n.userData.characterAsset) assets++;
        if (n.userData.ingredientActor) ingredients++;
      });
      data.scenes.push({ t, lights, assets, ingredients, programs: state.gl.info.programs.length,
        calls: state.gl.info.render.calls, triangles: state.gl.info.render.triangles,
        geometries: state.gl.info.memory.geometries, textures: state.gl.info.memory.textures });
    }
    requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);
  window.__workshopProbe = { data };
}
