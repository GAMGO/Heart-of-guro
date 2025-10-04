import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  PointerLockControls,
  Environment,
  useGLTF,
  useAnimations,
} from "@react-three/drei";
import * as THREE from "three";

import useHydroMovementReal from "../../physics/useHydroMovementReal";
import useVerticalHydroReal from "../../physics/useVerticalHydroReal";
import { HYDRO_CONFIG } from "../../physics/hydroConfig";

import "./Stage2.css";

useGLTF.preload("/pool.glb");

/*────────────────────────────── R키 수리 감지 ──────────────────────────────*/
function useRepairKeyOnly() {
  const [isRPressed, setIsRPressed] = useState(false);
  useEffect(() => {
    const down = (e) => e.code === "KeyR" && setIsRPressed(true);
    const up = (e) => e.code === "KeyR" && setIsRPressed(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  return isRPressed;
}

/*────────────────────────────── Stage2Inner ──────────────────────────────*/
function Stage2Inner({ onPositionUpdate, onRepairStart, onRepairComplete }) {
  const { camera, gl } = useThree();
  const { scene: pool, animations } = useGLTF("/pool.glb");
  const { actions, mixer } = useAnimations(animations, pool);

  const ready = useRef(false);
  const player = useRef(new THREE.Vector3(0, 1.75, 0));
  const worldBox = useRef(new THREE.Box3());
  const moveKeys = useRef({});
  const ballastRef = useRef(HYDRO_CONFIG.ballastKg);
  const vyRef = useRef(0);
  const yRef = useRef(1.75);

  const isRPressed = useRepairKeyOnly();
  const [isRepairing, setIsRepairing] = useState(false);

  // ✅ 링 목표
  const RING_POS = useMemo(() => new THREE.Vector3(-1.59, 0.0, 14.89), []);
  const REPAIR_DISTANCE = 2.0;

  // ✅ 물리 시스템
  const { step: stepXZ } = useHydroMovementReal(HYDRO_CONFIG);
  const { stepY } = useVerticalHydroReal(HYDRO_CONFIG);

  /*──────────────────────────── 초기화 ──────────────────────────────*/
  useEffect(() => {
    pool.updateMatrixWorld(true);
    worldBox.current.setFromObject(pool);
    const center = new THREE.Vector3();
    worldBox.current.getCenter(center);
    player.current.copy(center);
    player.current.y = 1.75;
    camera.position.copy(player.current);
    ready.current = true;
  }, [pool, camera]);

  /*──────────────────────────── 키 입력 ──────────────────────────────*/
  useEffect(() => {
    const dom = gl.domElement;
    const kd = (e) => {
      moveKeys.current[e.code] = true;
      if (e.code === "KeyE")
        ballastRef.current = Math.max(0, ballastRef.current - 1);
      if (e.code === "KeyR") ballastRef.current = ballastRef.current + 1;
      if (["Space", "ShiftLeft", "ShiftRight"].includes(e.code))
        e.preventDefault();
    };
    const ku = (e) => (moveKeys.current[e.code] = false);
    dom.tabIndex = 0;
    dom.focus();
    dom.addEventListener("keydown", kd, { passive: false });
    dom.addEventListener("keyup", ku);
    window.addEventListener("keydown", kd, { passive: false });
    window.addEventListener("keyup", ku, { passive: false });
    return () => {
      dom.removeEventListener("keydown", kd);
      dom.removeEventListener("keyup", ku);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [gl]);

  /*──────────────────────────── 수리 로직 ──────────────────────────────*/
  useEffect(() => {
    if (!isRPressed) return;
    const dist = player.current.distanceTo(RING_POS);
    if (dist <= REPAIR_DISTANCE) {
      setIsRepairing(true);
      onRepairStart?.();

      // 애니메이션 재생 or 2초 후 완료
      if (actions.fix) {
        actions.fix.setLoop(THREE.LoopOnce, 1);
        actions.fix.clampWhenFinished = true;
        actions.fix.reset().play();
        const onFinished = (event) => {
          if (event.action === actions.fix) {
            mixer.removeEventListener("finished", onFinished);
            setIsRepairing(false);
            onRepairComplete?.();
          }
        };
        mixer.addEventListener("finished", onFinished);
      } else {
        setTimeout(() => {
          setIsRepairing(false);
          onRepairComplete?.();
        }, 2000);
      }
    }
  }, [isRPressed, actions, mixer, onRepairStart, onRepairComplete, RING_POS]);

  /*──────────────────────────── 물리 루프 ──────────────────────────────*/
  useFrame((_, dt) => {
    if (!ready.current) return;
    const t = performance.now() * 0.001;

    const res = stepY({
      dt,
      y: yRef.current,
      vy: vyRef.current,
      weightCount: ballastRef.current,
      bounds: { minY: 1.75, maxY: 12.0 },
      speedXZ: 0,
      t,
    });

    yRef.current = res.newY;
    vyRef.current = res.newVy;

    const deltaXZ = stepXZ({
      dt,
      camera,
      moveKeys: moveKeys.current,
      effMass: Math.max(100, (res.totalMass ?? 200) * 0.8),
      bounds: null,
    });

    if (!Number.isFinite(deltaXZ.x)) deltaXZ.x = 0;
    if (!Number.isFinite(deltaXZ.y)) deltaXZ.y = 0;

    player.current.x += deltaXZ.x;
    player.current.z += deltaXZ.y;
    player.current.y = yRef.current;

    camera.position.copy(player.current);
    onPositionUpdate?.({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      ballast: ballastRef.current,
    });
  });

  return (
    <>
      <primitive object={pool} />
      {/* 수리 타겟 */}
      <mesh position={RING_POS} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.02, 16, 64]} />
        <meshStandardMaterial
          color={isRepairing ? "#00ff7f" : "#ff4040"}
          emissive={isRepairing ? "#00ff7f" : "#ff4040"}
          emissiveIntensity={1.4}
        />
      </mesh>
    </>
  );
}

/*──────────────────────────── Stage2 Wrapper ──────────────────────────────*/
export default function Stage2() {
  const [locked, setLocked] = useState(false);
  const ctrl = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0, z: 0 });
  const [ballast, setBallast] = useState(HYDRO_CONFIG.ballastKg);
  const [stage, setStage] = useState(1);

  const handlePositionUpdate = (p) => {
    setPos({
      x: p.x.toFixed(2),
      y: p.y.toFixed(2),
      z: p.z.toFixed(2),
    });
    if (p.ballast !== undefined) setBallast(p.ballast);
  };

  const handleRepairStart = () => setStage(3);
  const handleRepairComplete = () => setStage(4);

  const stageText =
    ["빨간 링을 찾으세요.", "접근 중...", "수리 중...", "✅ 수리 완료!"][
      stage - 1
    ] || "빨간 링을 찾으세요.";

  return (
    <div className="stage2-canvas">
      {!locked && (
        <div className="lock-hint" onClick={() => ctrl.current?.lock()}>
          클릭해서 시작 (WASD 이동 / Space·Shift 상승·하강 / E,R 부력 조정 / R
          수리)
        </div>
      )}

      {/* HUD */}
      <div className="quest-panel">
        <h3>Stage 2 — 외벽 수리 훈련</h3>
        <div className="quest-card">
          <p>{stageText}</p>
        </div>
        <div className="quest-card">
          <p>
            X:{pos.x} / Y:{pos.y} / Z:{pos.z}
          </p>
          <p>⚖️ Ballast: {ballast}</p>
        </div>
      </div>

      <Canvas camera={{ position: [8, 2, 8], fov: 60 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[8, 12, 6]} intensity={1.1} />
        <Suspense fallback={null}>
          <Stage2Inner
            onPositionUpdate={handlePositionUpdate}
            onRepairStart={handleRepairStart}
            onRepairComplete={handleRepairComplete}
          />
          <Environment preset="warehouse" />
        </Suspense>
        <PointerLockControls
          ref={ctrl}
          onLock={() => setLocked(true)}
          onUnlock={() => setLocked(false)}
        />
      </Canvas>
    </div>
  );
}
