import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import useVerticalHydroReal from "../../physics/useVerticalHydroReal";
import { buildEmuNblConfig } from "../../physics/nasaPresets";
import "./Stage3.css";

useGLTF.preload("/pool.glb");

function useKeys(){
  const k=useRef({w:false,a:false,s:false,d:false,shift:false})
  useEffect(()=>{
    const d=(e)=>{switch(e.code){case"KeyW":k.current.w=true;e.preventDefault();break;case"KeyA":k.current.a=true;e.preventDefault();break;case"KeyS":k.current.s=true;e.preventDefault();break;case"KeyD":k.current.d=true;e.preventDefault();break;case"ShiftLeft":case"ShiftRight":k.current.shift=true;break;}}
    const u=(e)=>{switch(e.code){case"KeyW":k.current.w=false;break;case"KeyA":k.current.a=false;break;case"KeyS":k.current.s=false;break;case"KeyD":k.current.d=false;break;case"ShiftLeft":case"ShiftRight":k.current.shift=false;break;}}
    window.addEventListener("keydown",d,{passive:false})
    window.addEventListener("keyup",u,{passive:true})
    return()=>{window.removeEventListener("keydown",d);window.removeEventListener("keyup",u)}
  },[])
  return k
}

function Stage3Inner(){
  const {camera}=useThree()
  const {scene:pool}=useGLTF("/pool.glb")
  const [ready,setReady]=useState(false)
  const worldBox=useRef(new THREE.Box3())
  const player=useRef(new THREE.Vector3())
  const keys=useKeys()
  const tmpDir=useMemo(()=>new THREE.Vector3(),[])
  const tmpNext=useMemo(()=>new THREE.Vector3(),[])
  const forward=useMemo(()=>new THREE.Vector3(),[])
  const right=useMemo(()=>new THREE.Vector3(),[])
  const up=useMemo(()=>new THREE.Vector3(0,1,0),[])
  const pad=0.25
  const minY=1.75
  const ceilY=useRef(12)
  const hydro=useVerticalHydroReal({...buildEmuNblConfig(),microBuoyancyLiters:0.4,microHz:0.06})

  useEffect(()=>{
    pool.updateMatrixWorld(true)
    pool.traverse((o)=>{if(!o.isMesh)return;const n=(o.name||"").toLowerCase();const c=o.material?.color;const m=c&&Math.abs(c.r-1)+Math.abs(c.g-0)+Math.abs(c.b-1)<0.4;if(n.includes("collider")||n.includes("collision")||m)o.visible=false})
    worldBox.current.setFromObject(pool)
    const c=new THREE.Vector3();worldBox.current.getCenter(c)
    ceilY.current=worldBox.current.max.y-pad
    player.current.set(c.x,minY,c.z)
    hydro.setY(minY);hydro.setVY(0)
    camera.position.copy(player.current)
    setReady(true)
  },[pool,camera,hydro])

  useFrame((_,dt)=>{
    if(!ready)return
    const base=keys.current.shift?3.5:2.0
    const speed=base*dt
    tmpDir.set(0,0,0)
    if(keys.current.w) tmpDir.z+=1
    if(keys.current.s) tmpDir.z-=1
    if(keys.current.a) tmpDir.x+=1
    if(keys.current.d) tmpDir.x-=1
    if(tmpDir.lengthSq()>0) tmpDir.normalize()
    camera.getWorldDirection(forward);forward.y=0;if(forward.lengthSq()===0) forward.set(0,0,-1);forward.normalize()
    right.copy(up).cross(forward).normalize()
    const moveX=right.x*tmpDir.x*speed+forward.x*tmpDir.z*speed
    const moveZ=right.z*tmpDir.x*speed+forward.z*tmpDir.z*speed
    tmpNext.set(player.current.x+moveX,player.current.y,player.current.z+moveZ)
    const r=hydro.step(dt)
    let y=r.y
    if(y<minY){y=minY;hydro.setY(y);hydro.setVY(0)}
    if(y>ceilY.current){y=ceilY.current;hydro.setY(y);hydro.setVY(0)}
    const min=worldBox.current.min.clone().addScalar(pad)
    const max=worldBox.current.max.clone().addScalar(-pad)
    tmpNext.x=THREE.MathUtils.clamp(tmpNext.x,min.x,max.x)
    tmpNext.z=THREE.MathUtils.clamp(tmpNext.z,min.z,max.z)
    player.current.set(tmpNext.x,y,tmpNext.z)
    camera.position.copy(player.current)
  })

  return <primitive object={pool}/>
}

export default function Stage3(){
  const [locked,setLocked]=useState(false)
  const ctrl=useRef(null)
  return(
    <div className="stage3-canvas">
      {!locked&&<div className="lock-hint" onClick={()=>ctrl.current?.lock()}>클릭해서 조작 시작 (WASD, Shift, 마우스로 시점)</div>}
      <Canvas camera={{position:[8,2,8],fov:60}}>
        <ambientLight intensity={0.7}/>
        <directionalLight position={[8,12,6]} intensity={1.1}/>
        <Suspense fallback={null}>
          <Stage3Inner/>
          <Environment preset="warehouse"/>
        </Suspense>
        <PointerLockControls ref={ctrl} onLock={()=>setLocked(true)} onUnlock={()=>setLocked(false)}/>
      </Canvas>
    </div>
  )
}
