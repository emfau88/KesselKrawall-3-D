// Browser-only, read-only instrumentation installed before application startup.
// No renderer finish/readPixels or production diagnostic hooks are introduced.
export function installCombatProbe({experiment='none',mode='diagnostic'}={}) {
  const data={marks:[],frames:[],longTasks:[],glSlow:[],glTotals:{},renders:[],shadow:[],programs:[],resources:[],experiments:experiment};
  const roots=new Set();let state,framePrevious,phase='navigation',lastDom='',lastEvent=-2,lastPrograms=-1,lastActors=0;
  const phases=[{t:0,phase:'navigation'}];
  const phaseAt=t=>phases.findLast(p=>p.t<=t)?.phase??'navigation';
  const hook={supportsFiber:true,inject(){return 1},onCommitFiberRoot(_id,root){roots.add(root)},onCommitFiberUnmount(){}};
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__=hook;
  function findState(){
    if(state?.gl?.domElement?.isConnected)return state;
    for(const root of roots){
      const queue=[root.current];let count=0;
      while(queue.length&&count++<12000){const n=queue.pop();if(!n)continue;
        const value=n.memoizedProps?.value;
        if(typeof value?.getState==='function'){const s=value.getState();if(s?.scene&&s?.gl){state=s;return s;}}
        if(n.child)queue.push(n.child);if(n.sibling)queue.push(n.sibling);
      }
    }
    return null;
  }
  function mark(name,detail){const t=performance.now();data.marks.push({name,t,detail});performance.mark(`kk:${name}`,{detail});}
  const programs=new WeakMap(),shaders=new WeakMap();let programId=0;
  const methods=['isProgram','compileShader','linkProgram','getProgramInfoLog','getShaderInfoLog','getProgramParameter','getShaderParameter','getActiveUniform','getActiveAttrib','getUniformLocation','useProgram','texImage2D','texSubImage2D','texImage3D','texSubImage3D','compressedTexImage2D','generateMipmap','bufferData','bufferSubData','drawElements','drawElementsInstanced','drawArrays'];
  const seen=new Set();
  data.patchedMethods=[];
  if(mode==='diagnostic')for(const proto of [window.WebGLRenderingContext?.prototype,window.WebGL2RenderingContext?.prototype].filter(Boolean)){
    for(const name of ['shaderSource','attachShader','createProgram',...methods]){
      if(!Object.hasOwn(proto,name)||seen.has(proto[name]))continue;
      const original=proto[name];seen.add(original);
      proto[name]=function(...args){
        if(name==='shaderSource')shaders.set(args[0],args[1]);
        if(name==='attachShader'){
          let p=programs.get(args[0]);if(!p){p={id:++programId};programs.set(args[0],p);}
          const src=shaders.get(args[1])??'';
          const defines=src.match(/^#define (?:NUM_\w+|USE_\w+|MORPHTARGETS_\w+).*$/gm)??[];
          p.defines=[...new Set([...(p.defines??[]),...defines])];
          const count=src.match(/uniform\s+PointLight\s+pointLights\s*\[\s*(\d+)/);
          if(count)p.pointLights=Number(count[1]);
        }
        const start=performance.now();
        try{const result=original.apply(this,args);if(name==='isProgram'&&!result)mark('disposed-program-observed',{program:programs.get(args[0])});return result}finally{
          const ms=performance.now()-start;
          const total=data.glTotals[name]??={calls:0,ms:0,maxMs:0};total.calls++;total.ms+=ms;total.maxMs=Math.max(total.maxMs,ms);
          if(ms>=4)data.glSlow.push({name,t:start,ms,phase,pname:typeof args[1]==='number'?args[1]:undefined,program:programs.get(args[0])});
        }
      };
      data.patchedMethods.push(`${proto===window.WebGL2RenderingContext?.prototype?'WebGL2':'WebGL1'}.${name}`);
    }
  }
  new PerformanceObserver(list=>data.longTasks.push(...list.getEntries().map(e=>({t:e.startTime,ms:e.duration})))).observe({type:'longtask',buffered:true});
  function observeDom(){
    const prep=document.querySelector('.battle-preparation');
    const next=prep?'preparation':document.querySelector('.result-panel')?'result':document.querySelector('.phase-battle')?'combat':document.querySelector('.shop-ribbon')?'workshop':'menu';
    const text=prep?.querySelector('h2')?.textContent??'';
    if(`${next}:${text}`!==lastDom){lastDom=`${next}:${text}`;phase=next;phases.push({t:performance.now(),phase});mark(next,{text});}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    new MutationObserver(observeDom).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});observeDom();
  });
  function instrument(s){
    if(s.gl.__kkInstrumented)return;s.gl.__kkInstrumented=true;
    const renderer=s.gl,original=renderer.render,shadow=renderer.shadowMap.render;
    let padding,arenaPointTarget;
    renderer.render=function(scene,camera){
      if(!data.sceneProbe&&phase==='combat'){const nodes=[];scene.traverse(n=>{if(n.name||n.userData.ingredientSide)nodes.push({name:n.name,side:n.userData.ingredientSide})});data.sceneProbe={matchesState:scene===s.scene,nodes};}
      if(experiment==='stable-light-count'&&(phase==='combat'||phase==='preparation')){
        if(!padding){const originalPoint=(()=>{let p;scene.traverse(n=>{if(n.isPointLight&&!p)p=n});return p})();
          padding=Array.from({length:20},()=>{const p=new originalPoint.constructor();p.intensity=0;p.visible=false;p.userData.probePadding=true;scene.add(p);return p;});
        }
        let actual=0;scene.traverseVisible(n=>{if(n.isPointLight&&!n.userData.probePadding)actual++});
        arenaPointTarget=20;
        padding.forEach((p,i)=>{p.visible=i<Math.max(0,arenaPointTarget-actual)});
      }else if(padding)padding.forEach(p=>{p.visible=false});
      let points=0;scene.traverseVisible(n=>{if(n.isPointLight)points++});const pointsBefore=points;
      const start=performance.now();try{return original.call(this,scene,camera)}finally{
        const ms=performance.now()-start;
        points=0;scene.traverseVisible(n=>{if(n.isPointLight)points++});
        if(ms>10||lastPrograms!==renderer.info.programs.length){data.renders.push({t:start,ms,phase,points,pointsBefore,programs:renderer.info.programs.length,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles});lastPrograms=renderer.info.programs.length;}
      }
    };
    renderer.shadowMap.render=function(...args){const start=performance.now();try{return shadow.apply(this,args)}finally{const ms=performance.now()-start;if(ms>4)data.shadow.push({t:start,ms,phase})}};
    const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
    data.gpu={vendor:gl.getParameter(debug?.UNMASKED_VENDOR_WEBGL??gl.VENDOR),renderer:gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL??gl.RENDERER),version:gl.getParameter(gl.VERSION),extensions:gl.getSupportedExtensions(),dpr:renderer.getPixelRatio(),drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight]};
    // GPU timer queries are asynchronous and never used to force completion.
    // Nested render/PMREM calls are ignored; disjoint samples are discarded.
    const timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');data.gpu.timerQueryAvailable=Boolean(timer);
    if(timer&&mode==='diagnostic'){let running=false,pending=[];const timed=renderer.render;renderer.render=function(...args){
      if(running||phase!=='combat')return timed.apply(this,args);
      for(const q of pending.filter(q=>gl.getQueryParameter(q.query,gl.QUERY_RESULT_AVAILABLE))){if(!gl.getParameter(timer.GPU_DISJOINT_EXT))(data.gpuTimes??=[]).push({t:q.t,ms:gl.getQueryParameter(q.query,gl.QUERY_RESULT)/1e6});gl.deleteQuery(q.query);pending=pending.filter(x=>x!==q);}
      const query=gl.createQuery();running=true;const t=performance.now();gl.beginQuery(timer.TIME_ELAPSED_EXT,query);try{return timed.apply(this,args)}finally{gl.endQuery(timer.TIME_ELAPSED_EXT);running=false;pending.push({query,t});}
    };}
    mark('renderer-instrumented');
  }
  function frame(now){
    if(framePrevious!==undefined)data.frames.push({t:now,ms:now-framePrevious,phase});framePrevious=now;
    const s=findState();if(s){instrument(s);let latest=-1;
      if(mode!=='minimal'&&now-lastActors>80){lastActors=now;
      s.scene.traverse(n=>{if(n.userData.ingredientActor&&n.userData.active)latest=Math.max(latest,n.userData.animationKey)});
      if(latest>=0&&latest!==lastEvent){lastEvent=latest;mark('ingredient-activation',{eventIndex:latest,actors:actors()});}
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  function actors(){const a=[];findState()?.scene.traverse(n=>{if(n.userData.ingredientActor)a.push({...n.userData,rotation:n.rotation.toArray(),scale:n.scale.toArray()})});return a;}
  function slots(){const s=findState();if(!s)return[];s.scene.updateMatrixWorld(true);return [...s.scene.children].flatMap(()=>[]).concat((()=>{const a=[];s.scene.traverse(n=>{if(n.userData.ingredientSlot!==undefined){const p=n.position.clone().set(0,.14,0).applyMatrix4(n.matrixWorld).project(s.camera);a.push({slot:n.userData.ingredientSlot,x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2})}});return a;})());}
  function restoreFixture(fixture){
    if(!document.querySelector('.shop-ribbon'))throw new Error('Fixture restore is allowed only after native return to workshop');
    for(const root of roots){const queue=[root.current];while(queue.length){const n=queue.pop();if(!n)continue;
      for(let h=n.memoizedState;h&&h.memoizedState!==undefined;h=h.next){
        const v=h.memoizedState;if(v?.version===1&&Array.isArray(v.board)&&v.phase==='shop'&&h.queue?.dispatch){h.queue.dispatch(fixture);mark('fixture-restored',{round:fixture.round});return;}
      }
      if(n.child)queue.push(n.child);if(n.sibling)queue.push(n.sibling);
    }}
    throw new Error('App game-state hook was not located');
  }
  window.__combatProbe={mark,slots,actors,restoreFixture,state:findState,data,snapshot(){
    const liveRenderer = findState()?.gl;
    data.currentBuffer = liveRenderer ? { width: liveRenderer.domElement.width, height: liveRenderer.domElement.height, dpr: liveRenderer.getPixelRatio() } : null;
    const s=findState();return {...data,phases,frames:data.frames.map(f=>({...f,phase:phaseAt(f.t),phaseStart:phaseAt(f.t-f.ms)})),longTasks:data.longTasks.map(t=>({...t,phase:phaseAt(t.t)})),now:performance.now(),browser:{userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,deviceMemory:navigator.deviceMemory,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,coarsePointer:matchMedia('(pointer: coarse)').matches,visibilityState:document.visibilityState},renderer:s?{programs:s.gl.info.programs.length,render:{...s.gl.info.render},memory:{...s.gl.info.memory},shadowMapSize:(()=>{let size; s.scene.traverse(n=>{if(n.isLight&&n.castShadow)size=n.shadow.mapSize.toArray()});return size})()}:null,resources:performance.getEntriesByType('resource').map(r=>({name:r.name,start:r.startTime,ms:r.duration,transfer:r.transferSize,encoded:r.encodedBodySize,decoded:r.decodedBodySize}))};}};
  mark('probe-installed');
}
