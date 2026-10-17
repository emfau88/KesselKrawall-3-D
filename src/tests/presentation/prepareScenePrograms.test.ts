import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PerspectiveCamera, Scene, type WebGLRenderer } from "three";

import { prepareScenePrograms } from "../../presentation/scene/prepareScenePrograms";

function fixture({ parallel = true, count = 2 } = {}) {
  const handles = Array.from({ length: count }, () => ({}) as WebGLProgram);
  const complete = new Set<WebGLProgram>();
  const alive = new Set(handles);
  let contextLost = false;
  const extension = { COMPLETION_STATUS_KHR: 0x91b1 };
  const gl = {
    getExtension: vi.fn((name: string) => name === "KHR_parallel_shader_compile" && parallel ? extension : null),
    isContextLost: vi.fn(() => contextLost),
    isProgram: vi.fn((program: WebGLProgram) => alive.has(program)),
    getProgramParameter: vi.fn((program: WebGLProgram, parameter: number) => {
      if (!alive.has(program)) throw new Error("Disposed program was queried");
      if (parameter !== extension.COMPLETION_STATUS_KHR) throw new Error("A synchronizing program query was used");
      return complete.has(program);
    }),
  };
  const info: { programs: Array<{ program?: WebGLProgram }> } = { programs: [] };
  const compile = vi.fn(() => {
    info.programs.push(...handles.map(program => ({ program })), {});
  });
  const renderer = { compile, getContext: () => gl, info } as unknown as WebGLRenderer;
  const scene = new Scene();
  const camera = new PerspectiveCamera();
  return {
    handles, complete, alive, gl, compile, renderer, scene, camera,
    loseContext: () => { contextLost = true; },
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("asynchronous scene program preparation", () => {
  test("waits for every newly compiled program without synchronizing link queries", async () => {
    const state = fixture();
    const preparation = prepareScenePrograms(state.renderer, state.scene, state.camera);
    let settled = false;
    void preparation.ready.then(() => { settled = true; });

    expect(state.compile).toHaveBeenCalledExactlyOnceWith(state.scene, state.camera);
    await vi.advanceTimersByTimeAsync(30);
    expect(settled).toBe(false);

    state.complete.add(state.handles[0]!);
    await vi.advanceTimersByTimeAsync(20);
    expect(settled).toBe(false);

    state.complete.add(state.handles[1]!);
    await vi.advanceTimersByTimeAsync(10);
    await expect(preparation.ready).resolves.toBe(true);
    expect(state.gl.getProgramParameter).toHaveBeenCalledWith(state.handles[1], 0x91b1);
    expect(vi.getTimerCount()).toBe(0);
  });

  test("cancelling resolves false and never queries handles disposed afterwards", async () => {
    const state = fixture();
    const preparation = prepareScenePrograms(state.renderer, state.scene, state.camera);
    preparation.cancel();
    state.alive.clear();
    const queries = state.gl.getProgramParameter.mock.calls.length;
    const validityChecks = state.gl.isProgram.mock.calls.length;

    await expect(preparation.ready).resolves.toBe(false);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(state.gl.getProgramParameter).toHaveBeenCalledTimes(queries);
    expect(state.gl.isProgram).toHaveBeenCalledTimes(validityChecks);
    expect(vi.getTimerCount()).toBe(0);
    expect(() => preparation.cancel()).not.toThrow();
  });

  test("context loss stops polling before querying invalid program handles", async () => {
    const state = fixture();
    const preparation = prepareScenePrograms(state.renderer, state.scene, state.camera);
    const queries = state.gl.getProgramParameter.mock.calls.length;
    state.loseContext();
    state.alive.clear();

    await vi.advanceTimersByTimeAsync(10);
    await expect(preparation.ready).resolves.toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    expect(state.gl.getProgramParameter).toHaveBeenCalledTimes(queries);
    expect(vi.getTimerCount()).toBe(0);
  });

  test("retired workshop programs are skipped while every live program must still finish", async () => {
    const state = fixture({ count: 3 });
    const preparation = prepareScenePrograms(state.renderer, state.scene, state.camera);
    let settled = false;
    void preparation.ready.then(() => { settled = true; });
    state.alive.delete(state.handles[1]!);

    await vi.advanceTimersByTimeAsync(10);
    expect(settled).toBe(false);
    state.complete.add(state.handles[0]!);
    await vi.advanceTimersByTimeAsync(10);
    expect(settled).toBe(false);
    expect(state.gl.getProgramParameter).toHaveBeenCalledWith(state.handles[2], 0x91b1);

    state.complete.add(state.handles[2]!);
    await vi.advanceTimersByTimeAsync(10);
    await expect(preparation.ready).resolves.toBe(true);
    expect(state.gl.getProgramParameter.mock.calls.some(([program]) => program === state.handles[1])).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  test("an already lost context reports failure immediately", async () => {
    const state = fixture();
    state.loseContext();
    const preparation = prepareScenePrograms(state.renderer, state.scene, state.camera);

    await expect(preparation.ready).resolves.toBe(false);
    expect(state.gl.getProgramParameter).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  test("without KHR uses the explicit renderer fallback without claiming a completion query", async () => {
    const state = fixture({ parallel: false });
    const preparation = prepareScenePrograms(state.renderer, state.scene, state.camera);

    // Rendering remains available; without this extension the helper cannot
    // promise that the driver's first program use will avoid a blocking wait.
    await expect(preparation.ready).resolves.toBe(true);
    expect(state.compile).toHaveBeenCalledOnce();
    expect(state.gl.getProgramParameter).not.toHaveBeenCalled();
    expect(state.gl.isProgram).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  test("a scene without registered program handles completes without polling", async () => {
    const state = fixture({ count: 0 });
    const preparation = prepareScenePrograms(state.renderer, state.scene, state.camera);

    await expect(preparation.ready).resolves.toBe(true);
    expect(state.gl.getProgramParameter).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
