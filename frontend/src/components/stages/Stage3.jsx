import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import useVerticalHydroReal from "../../physics/useVerticalHydroReal";
import { buildEmuNblConfig } from "../../physics/nasaPresets";
import "./Stage3.css";

useGLTF.preload("/pool.glb");

function useKeys(){
  const k=useRef({w:false,a:false,s:false,d:false,shift:false});
  useEffect(()=>{
    const d=(e)=>{switch(e.code){
      case"KeyW":k.current.w=true;e.preventDefault();break;
      case"KeyA":k.current.a=true;e.preventDefault();break;
      case"KeyS":k.current.s=true;e.preventDefault();break;
      case"KeyD":k.current.d=true;e.preventDefault();break;
      case"ShiftLeft":case"ShiftRight":k.current.shift=true;break;}};
    const u=(e)=>{switch(e.code){
      case"KeyW":k.current.w=false;break;
      case"KeyA":k.current.a=false;break;
      case"KeyS":k.current.s=false;break;
      case"KeyD":k.current.d=false;break;
      case"ShiftLeft":case"ShiftRight":k.current.shift=false;break;}};
    window.addEventListener("keydown",d,{passive:false});
    window.addEventListener("keyup",u,{passive:true});
    return()=>{window.removeEventListener("keydown",d);window.removeEventListener("keyup",u);}
  },[]);
  return k;
}

function Stage3Inner({setWaterUI}){
  const { camera, gl, scene } = useThree();
  const { scene: pool } = useGLTF("/pool.glb");
  const [ready,setReady]=useState(false);

  const worldBox=useRef(new THREE.Box3());
  const spaceshipBox=useRef(null);
  const waterBox=useRef(null);
  const wallBoxes=useRef([]);

  const player=useRef(new THREE.Vector3());
  const keys=useKeys();

  const tmpDir = useMemo(()=>new THREE.Vector3(),[]);
  const tmpNext= useMemo(()=>new THREE.Vector3(),[]);
  const forward= useMemo(()=>new THREE.Vector3(),[]);
  const right  = useMemo(()=>new THREE.Vector3(),[]);
  const up     = useMemo(()=>new THREE.Vector3(0,1,0),[]);
  const tmpMin = useMemo(()=>new THREE.Vector3(),[]);
  const tmpMax = useMemo(()=>new THREE.Vector3(),[]);
  const tmpCtr = useMemo(()=>new THREE.Vector3(),[]);

  const pad=0.25, minY=1.75, radius=0.4;
  const ceilY=useRef(12);
  const hydro=useVerticalHydroReal({...buildEmuNblConfig(),microBuoyancyLiters:0.4,microHz:0.06});

  const ambRef=useRef();
  const dirRef=useRef();
  const inWaterRef=useRef(false);

  const resolvePointAABB=(p,box,r)=>{
    if(!box) return false;
    const ix=p.x>box.min.x-r && p.x<box.max.x+r;
    const iy=p.y>box.min.y-r && p.y<box.max.y+r;
    const iz=p.z>box.min.z-r && p.z<box.max.z+r;
    if(!(ix&&iy&&iz)) return false;
    const ox1=(p.x+r)-box.min.x, ox2=box.max.x-(p.x-r);
    const oy1=(p.y+r)-box.min.y, oy2=box.max.y-(p.y-r);
    const oz1=(p.z+r)-box.min.z, oz2=box.max.z-(p.z-r);
    const dx=Math.min(ox1,ox2), dy=Math.min(oy1,oy2), dz=Math.min(oz1,oz2);
    box.getCenter(tmpCtr);
    if(dx<=dy && dx<=dz){ if(p.x>tmpCtr.x) p.x=box.max.x+r; else p.x=box.min.x-r; return "x"; }
    else if(dy<=dx && dy<=dz){ if(p.y>tmpCtr.y) p.y=box.max.y+r; else p.y=box.min.y-r; return "y"; }
    else { if(p.z>tmpCtr.z) p.z=box.max.z+r; else p.z=box.min.z-r; return "z"; }
  };

  const collideAll=(p,boxes,r,passes=3)=>{
    let hit=false, axis=null;
    for(let n=0;n<passes;n++){
      let any=false;
      for(const b of boxes){
        const res=resolvePointAABB(p,b,r);
        if(res){ any=true; hit=true; axis=res; }
      }
      if(!any) break;
    }
    return {hit,axis};
  };

  const buildBoxes=(root,fn)=>{
    const nodes=[];
    root.traverse((o)=>{ if(o.isMesh && fn(o)) nodes.push(o); });
    if(!nodes.length) return [];
    const out=[];
    const tb=new THREE.Box3();
    nodes.forEach((o)=>{ tb.setFromObject(o); out.push(tb.clone()); });
    return out;
  };

  useEffect(()=>{
    pool.updateMatrixWorld(true);
    pool.traverse((o)=>{
      if(!o.isMesh) return;
      const n=(o.name||"").toLowerCase();
      const c=o.material?.color;
      const m=c&&Math.abs(c.r-1)+Math.abs(c.g-0)+Math.abs(c.b-1)<0.4;
      if(n.includes("collider")||n.includes("collision")||m) o.visible=false;
    });

    const spaceshipNodes=[];
    pool.traverse((o)=>{ if(o.isMesh && (o.name||"").toLowerCase().includes("spaceship")) spaceshipNodes.push(o); });
    if(spaceshipNodes.length){
      const b=new THREE.Box3(), tb=new THREE.Box3();
      spaceshipNodes.forEach((o)=>{ tb.setFromObject(o); b.union(tb); });
      b.min.subScalar(0.001); b.max.addScalar(0.001);
      spaceshipBox.current=b;
    }else{
      spaceshipBox.current=null;
    }

    waterBox.current=null;
    const wbs=buildBoxes(pool,(o)=> (o.name||"").toLowerCase().includes("water"));
    if(wbs.length){
      const b=new THREE.Box3(); wbs.forEach(bb=>b.union(bb)); waterBox.current=b;
    }

    wallBoxes.current=[
      ...buildBoxes(pool,(o)=>/(wall|pool[_-\s]?wall|border|barrier|edge|rim)/i.test(o.name||"")),
      ...buildBoxes(pool,(o)=>/(tile|tiles)/i.test(o.name||"") && /(wall)/i.test(o.parent?.name||""))
    ];

    worldBox.current.setFromObject(pool);
    ceilY.current=worldBox.current.max.y - pad;

    player.current.set(4,minY,8);
    hydro.setY(minY); hydro.setVY(0);
    camera.position.copy(player.current);

    const dom = gl.domElement;
    const lockOnClick = () => { if (document.pointerLockElement !== dom) dom.requestPointerLock?.(); };
    dom.addEventListener("click", lockOnClick);

    scene.fog = new THREE.FogExp2("#a3d7ff", 0.0);
    gl.setClearColor("#87cefa", 1);

    setReady(true);
    return ()=>{ dom.removeEventListener("click", lockOnClick); };
  },[pool,camera,gl,scene,hydro]);

  useFrame((_,dt)=>{
    if(!ready) return;

    const camPos=camera.position;
    const wb=waterBox.current;
    const insideWater = !!(wb && camPos.x>wb.min.x && camPos.x<wb.max.x && camPos.y>wb.min.y && camPos.y<wb.max.y && camPos.z>wb.min.z && camPos.z<wb.max.z);
    if(insideWater!==inWaterRef.current){
      inWaterRef.current=insideWater;
      setWaterUI(insideWater);
    }
    const fogTarget = insideWater ? 0.025 : 0.0;
    scene.fog.density += (fogTarget - scene.fog.density) * Math.min(1, dt*5);
    const ambTarget = insideWater ? 0.65 : 0.8;
    const dirTarget = insideWater ? 0.9 : 1.1;
    if(ambRef.current) ambRef.current.intensity += (ambTarget-ambRef.current.intensity)*Math.min(1,dt*5);
    if(dirRef.current) dirRef.current.intensity += (dirTarget-dirRef.current.intensity)*Math.min(1,dt*5);
    gl.setClearColor(insideWater ? "#9fdfff" : "#87cefa");

    const baseAir=2.0, baseWater=1.45;
    const base=(insideWater?baseWater:baseAir)*(keys.current.shift?1.75:1.0);
    const speed=base*dt;

    tmpDir.set(0,0,0);
    if(keys.current.w) tmpDir.z += 1;
    if(keys.current.s) tmpDir.z -= 1;
    if(keys.current.a) tmpDir.x -= 1;
    if(keys.current.d) tmpDir.x += 1;
    if(tmpDir.lengthSq()>0) tmpDir.normalize();

    camera.getWorldDirection(forward);
    forward.y=0; if(forward.lengthSq()===0) forward.set(0,0,-1);
    forward.normalize();
    right.crossVectors(forward, up).normalize();

    const moveX = right.x*tmpDir.x*speed + forward.x*tmpDir.z*speed;
    const moveZ = right.z*tmpDir.x*speed + forward.z*tmpDir.z*speed;

    tmpNext.set(player.current.x+moveX, player.current.y, player.current.z+moveZ);

    const r=hydro.step(dt);
    let y=r.y;
    if(y<minY){ y=minY; hydro.setY(y); hydro.setVY(0); }
    if(y>ceilY.current){ y=ceilY.current; hydro.setY(y); hydro.setVY(0); }
    tmpNext.y=y;

    tmpMin.copy(worldBox.current.min).addScalar(pad);
    tmpMax.copy(worldBox.current.max).addScalar(-pad);
    tmpNext.x=THREE.MathUtils.clamp(tmpNext.x,tmpMin.x,tmpMax.x);
    tmpNext.z=THREE.MathUtils.clamp(tmpNext.z,tmpMin.z,tmpMax.z);

    const sHit = resolvePointAABB(tmpNext,spaceshipBox.current,radius);
    if(sHit==="y"){ hydro.setY(tmpNext.y); hydro.setVY(0); }

    const wRes = collideAll(tmpNext,wallBoxes.current,radius,4);
    if(wRes.hit && wRes.axis==="y"){ hydro.setY(tmpNext.y); hydro.setVY(0); }

    player.current.copy(tmpNext);
    camera.position.copy(player.current);
  });

  return (
    <>
      <ambientLight ref={ambRef} intensity={0.8}/>
      <directionalLight ref={dirRef} position={[8,12,6]} intensity={1.1}/>
      <primitive object={pool} />
    </>
  );
}

export default function Stage3(){
  const [locked,setLocked]=useState(false);
  const [inWater,setInWater]=useState(false);
  const ctrl=useRef(null);
  return(
    <div className="stage3-canvas">
      {!locked && <div className="lock-hint" onClick={()=>ctrl.current?.lock()}>클릭해서 조작 시작 (WASD, Shift, 마우스로 시점)</div>}
      {inWater && (
        <div style={{
          position:"absolute",
          inset:0,
          pointerEvents:"none",
          background:"radial-gradient(ellipse at 50% 20%, rgba(150,220,255,0.15) 0%, rgba(100,180,255,0.25) 60%, rgba(60,140,200,0.35) 100%)",
          mixBlendMode:"screen",
          transition:"opacity 180ms ease",
          opacity:1
        }}/>
      )}
      <Canvas camera={{position:[8,2,8],fov:60}}>
        <Suspense fallback={null}>
          <Stage3Inner setWaterUI={setInWater}/>
          <Environment preset="sunset"/>
        </Suspense>
        <PointerLockControls ref={ctrl} onLock={()=>setLocked(true)} onUnlock={()=>setLocked(false)}/>
      </Canvas>
    </div>
  );
}
