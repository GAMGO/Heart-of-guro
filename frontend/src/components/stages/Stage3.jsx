import React, { Suspense, useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import useHydroMovementReal from "../../physics/useHydroMovementReal";
import useVerticalHydroReal from "../../physics/useVerticalHydroReal";
import { HYDRO_CONFIG } from "../../physics/hydroConfig";
import { SimProvider, useSim } from "../../common/SimContext";
import StageShell from "../../common/StageShell";
import HUD from "../../common/HUD";
import "./Stage3.css";

useGLTF.preload("/pool.glb");

const SPAWN_POS = new THREE.Vector3(-1.02, 2.4, 15.06);
const RING_POS = new THREE.Vector3(-5.489, 0, -7.946);

function Pool() {
  const { scene } = useGLTF("/pool.glb");
  return <primitive object={scene} />;
}

function Stage3Inner() {
  const { camera, gl, scene } = useThree();
  const { posRef, ballast, setBallast, setStageText } = useSim();
  const ready = useRef(false);
  const moveKeys = useRef({});
  const yRef = useRef(SPAWN_POS.y);
  const vyRef = useRef(0);
  const tRef = useRef(0);
  const { stepY } = useVerticalHydroReal(HYDRO_CONFIG);
  const { step: stepXZ } = useHydroMovementReal(HYDRO_CONFIG);
  useEffect(() => {
    scene.fog = new THREE.FogExp2("#a3d7ff", 0.015);
    gl.setClearColor("#87cefa", 1);
    camera.position.copy(SPAWN_POS);
    camera.lookAt(0,1.5,0);
    ready.current = true;
    setStageText("빨간 링 근처로 이동하세요");
  }, [scene, gl, camera, setStageText]);
  useEffect(() => {
    const kd = (e) => {
      moveKeys.current[e.code] = true;
      if (e.code==="KeyE") setBallast(v=>Math.max(0,v-1));
      if (e.code==="KeyR") setBallast(v=>v+1);
      if (["Space","ShiftLeft","ShiftRight"].includes(e.code)) e.preventDefault();
    };
    const ku = (e) => (moveKeys.current[e.code] = false);
    const dom = gl.domElement;
    dom.tabIndex = 0; dom.focus();
    dom.addEventListener("keydown", kd, { passive:false });
    dom.addEventListener("keyup", ku, { passive:false });
    window.addEventListener("keydown", kd, { passive:false });
    window.addEventListener("keyup", ku, { passive:false });
    return () => {
      dom.removeEventListener("keydown", kd);
      dom.removeEventListener("keyup", ku);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [gl, setBallast]);
  useFrame((_, dt) => {
    if (!ready.current) return;
    tRef.current += dt;
    const res = stepY({ dt, y:yRef.current, vy:vyRef.current, weightCount:ballast, bounds:{minY:1.5,maxY:12}, speedXZ:0, t:tRef.current });
    vyRef.current = res.newVy;
    yRef.current = res.newY;
    const d = stepXZ({ dt, camera, moveKeys: moveKeys.current, effMass: Math.max(100,res.totalMass??180) });
    if (Number.isFinite(d.x)) camera.position.x += d.x;
    if (Number.isFinite(d.y)) camera.position.z += d.y;
    camera.position.y = yRef.current;
    const dist = camera.position.distanceTo(RING_POS);
    if (dist < 2) setStageText("✅ 미션 완료");
    posRef.current = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  });
  return (
    <>
      <Pool/>
      <mesh position={RING_POS} rotation={[Math.PI/2,0,0]}>
        <torusGeometry args={[0.8,0.02,16,64]}/>
        <meshStandardMaterial color="#ff4040" emissive="#ff4040" emissiveIntensity={1.3} roughness={0.35}/>
      </mesh>
    </>
  );
}

export default function Stage3() {
  return (
    <SimProvider initialBallast={HYDRO_CONFIG.ballastKg}>
      <StageShell camera={{ position:[SPAWN_POS.x, SPAWN_POS.y, SPAWN_POS.z], fov:60 }} envPreset="sunset" title={<HUD title="Stage 3" extra={null}/>}>
        <Suspense fallback={null}>
          <Stage3Inner/>
        </Suspense>
      </StageShell>
    </SimProvider>
  );
}
