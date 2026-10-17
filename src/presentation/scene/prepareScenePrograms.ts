import type { Camera, Scene, WebGLRenderer } from "three";

/** The same KHR completion check used by Three.compileAsync, with cancellation.
 * Captures program handles instead of materials, which can be disposed when the
 * player cancels preparation. No synchronous LINK_STATUS or forced GPU finish.
 */
export function prepareScenePrograms(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
  renderer.compile(scene, camera);
  const gl = renderer.getContext();
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  const programs = (renderer.info.programs ?? []).map(program => program.program as WebGLProgram | undefined).filter((program): program is WebGLProgram => Boolean(program));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finish: (ready: boolean) => void = () => {};
  let cancelled = false;
  const ready = new Promise<boolean>(resolve => {
    finish = resolve;
    function poll() {
      if (cancelled || gl.isContextLost()) { resolve(false); return; }
      // Without KHR the existing renderer remains usable, but asynchronous
      // completion cannot be guaranteed. This fallback is documented/tested.
      // Renderer info can still contain the previous workshop's programs when
      // R3F has queued their disposal at idle priority. Retired handles no longer
      // need preparation; every remaining live program must finish compiling.
      const livePrograms = parallel ? programs.filter(program => gl.isProgram(program)) : [];
      if (!parallel || livePrograms.every(program => gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR))) {
        resolve(true);
      } else timer = setTimeout(poll, 10);
    }
    poll();
  });
  return { ready, cancel() { cancelled = true; clearTimeout(timer); finish(false); } };
}
