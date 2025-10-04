import React, { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import useHydroMovementReal from "../../physics/useHydroMovementReal";
import useVerticalHydroReal from "../../physics/useVerticalHydroReal";
import { HYDRO_CONFIG } from "../../physics/hydroConfig";
import { SimProvider, useSim } from "../../common/SimContext";
import StageShell from "../../common/StageShell";
import HUD from "../../common/HUD";

function Pool() {
  const { scene } = useGLTF("/pool.glb");
  return <primitive object={scene} scale={1} />;
}

function SimController() {
  const { camera, clock } = useThree();
  const moveKeys = useRef({});
  const { posRef, ballast, setBallast, targetRef } = useSim();
  const { step: stepXZ } = useHydroMovementReal(HYDRO_CONFIG);
  const { stepY } = useVerticalHydroReal(HYDRO_CONFIG);
  const vyRef = useRef(0);
  const yRef = useRef(1.75);
  useEffect(() => {
    const kd = (e) => {
      moveKeys.current[e.code] = true;
      if (e.code==="KeyE") setBallast(v=>Math.max(0,v-1));
      if (e.code==="KeyR") setBallast(v=>v+1);
      if (["Space","ShiftLeft","ShiftRight"].includes(e.code)) e.preventDefault();
    };
    const ku = (e) => (moveKeys.current[e.code] = false);
    window.addEventListener("keydown", kd, { passive:false });
    window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [setBallast]);
  useEffect(()=>{ if(!targetRef.current) targetRef.current = 1.8 + Math.random()*1.5; },[targetRef]);
  useFrame((_, dt) => {
    const t = clock.getElapsedTime();
    const res = stepY({ dt, y:yRef.current, vy:vyRef.current, weightCount: ballast, bounds:{minY:1.75,maxY:12}, speedXZ:0, t });
    yRef.current = res.newY;
    vyRef.current = res.newVy;
    const d = stepXZ({ dt, camera, moveKeys: moveKeys.current, effMass: Math.max(100,(res.totalMass??180)*0.7) });
    if (Number.isFinite(d.x)) camera.position.x += d.x;
    if (Number.isFinite(d.y)) camera.position.z += d.y;
    camera.position.y = yRef.current;
    posRef.current = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  });
  return null;
}

function Stage1Inner() {
  return (
    <>
      <ambientLight intensity={0.6}/>
      <directionalLight position={[5,5,5]} intensity={1.2}/>
      <Pool/>
      <SimController/>
    </>
  );
}

export default function Stage1() {
  return (
    <SimProvider initialBallast={HYDRO_CONFIG.ballastKg}>
      <StageShell camera={{ position:[0,2,6], fov:75 }} envPreset="warehouse" title={<HUD title="Stage 1" extra={null}/>}>
        <Stage1Inner/>
      </StageShell>
    </SimProvider>
  );
}
