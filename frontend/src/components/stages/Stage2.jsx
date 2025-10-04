import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import useHydroMovementReal from "../../physics/useHydroMovementReal";
import useVerticalHydroReal from "../../physics/useVerticalHydroReal";
import { HYDRO_CONFIG } from "../../physics/hydroConfig";
import { SimProvider, useSim } from "../../common/SimContext";
import StageShell from "../../common/StageShell";
import HUD from "../../common/HUD";
import "./Stage2.css";

useGLTF.preload("/pool.glb");

const RING_POS = new THREE.Vector3(-1.59, 0.0, 14.89);
const REPAIR_DISTANCE = 2.0;

function Pool() {
  const { scene } = useGLTF("/pool.glb");
  return <primitive object={scene} />;
}

function Stage2Inner() {
  const { camera, gl } = useThree();
  const { posRef, ballast, setBallast, setStageText } = useSim();
  const { scene: pool, animations } = useGLTF("/pool.glb");
  const { actions, mixer } = useAnimations(animations, pool);
  const ready = useRef(false);
  const moveKeys = useRef({});
  const vyRef = useRef(0);
  const yRef = useRef(1.75);
  const repairingRef = useRef(false);
  const { step: stepXZ } = useHydroMovementReal(HYDRO_CONFIG);
  const { stepY } = useVerticalHydroReal(HYDRO_CONFIG);

  useEffect(() => {
    pool.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(pool);
    const c = new THREE.Vector3();
    box.getCenter(c);
    c.y = 1.75;
    camera.position.copy(c);
    ready.current = true;
    setStageText("빨간 링을 찾으세요.");
  }, [pool, camera, setStageText]);

  useEffect(() => {
    const kd = (e) => {
      moveKeys.current[e.code] = true;
      if (e.code === "KeyE") setBallast((v) => Math.max(0, v - 1));
      if (e.code === "KeyR") setBallast((v) => v + 1);
      if (["Space", "ShiftLeft", "ShiftRight"].includes(e.code)) e.preventDefault();
    };
    const ku = (e) => (moveKeys.current[e.code] = false);
    const dom = gl.domElement;
    dom.tabIndex = 0;
    dom.focus();
    dom.addEventListener("keydown", kd, { passive: false });
    dom.addEventListener("keyup", ku, { passive: false });
    window.addEventListener("keydown", kd, { passive: false });
    window.addEventListener("keyup", ku, { passive: false });
    return () => {
      dom.removeEventListener("keydown", kd);
      dom.removeEventListener("keyup", ku);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [gl, setBallast]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== "KeyR") return;
      if (repairingRef.current) return;
      const dist = camera.position.distanceTo(RING_POS);
      if (dist > REPAIR_DISTANCE) return;
      repairingRef.current = true;
      setStageText("수리 중...");
      if (actions && actions.fix) {
        actions.fix.setLoop(THREE.LoopOnce, 1);
        actions.fix.clampWhenFinished = true;
        actions.fix.reset().play();
        const onFinished = (ev) => {
          if (ev.action !== actions.fix) return;
          mixer.removeEventListener("finished", onFinished);
          setStageText("✅ 수리 완료!");
        };
        mixer.addEventListener("finished", onFinished);
      } else {
        setTimeout(() => setStageText("✅ 수리 완료!"), 2000);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [camera, actions, mixer, setStageText]);

  useFrame((_, dt) => {
    if (!ready.current) return;
    const t = performance.now() * 0.001;
    const res = stepY({ dt, y: yRef.current, vy: vyRef.current, weightCount: ballast, bounds: { minY: 1.75, maxY: 12 }, speedXZ: 0, t });
    yRef.current = res.newY;
    vyRef.current = res.newVy;
    const d = stepXZ({ dt, camera, moveKeys: moveKeys.current, effMass: Math.max(100, (res.totalMass ?? 200) * 0.8) });
    if (Number.isFinite(d.x)) camera.position.x += d.x;
    if (Number.isFinite(d.y)) camera.position.z += d.y;
    camera.position.y = yRef.current;
    const dist = camera.position.distanceTo(RING_POS);
    if (!repairingRef.current) {
      if (dist <= REPAIR_DISTANCE) setStageText("접근 중... R로 수리");
      else setStageText("빨간 링을 찾으세요.");
    }
    posRef.current = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  });

  return (
    <>
      <primitive object={pool} />
      <mesh position={RING_POS} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.02, 16, 64]} />
        <meshStandardMaterial color="#ff4040" emissive="#ff4040" emissiveIntensity={1.4} />
      </mesh>
    </>
  );
}

export default function Stage2() {
  return (
    <SimProvider initialBallast={HYDRO_CONFIG.ballastKg}>
      <StageShell camera={{ position: [8, 2, 8], fov: 60 }} envPreset="warehouse" title={<HUD title="Stage 2" extra={null} />}>
        <Suspense fallback={null}>
          <Stage2Inner />
          <Environment preset="warehouse" />
        </Suspense>
      </StageShell>
    </SimProvider>
  );
}
