import React, { Suspense, useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import useHydroMovementReal from "../../physics/useHydroMovementReal";
import useVerticalHydroReal from "../../physics/useVerticalHydroReal";
import { HYDRO_CONFIG } from "../../physics/hydroConfig";
import "./Stage3.css";

useGLTF.preload("/pool.glb");

// 초기 위치 및 목표 링
const SPAWN_POS = new THREE.Vector3(-1.02, 2.4, 15.06);
const RING_POS = new THREE.Vector3(-5.489, 0, -7.946);
const RING_COLOR = "#ff4040";

/*────────────────────────────── Stage3Inner ──────────────────────────────*/
function Stage3Inner({ onPositionUpdate, onRepairComplete }) {
  const { camera, gl, scene } = useThree();
  const { scene: pool } = useGLTF("/pool.glb");

  const ready = useRef(false);
  const moveKeys = useRef({});
  const ballastRef = useRef(HYDRO_CONFIG.ballastKg);
  const yRef = useRef(SPAWN_POS.y);
  const vyRef = useRef(0);
  const trimRef = useRef(0);
  const tRef = useRef(0);

  // 물리 훅
  const { stepY } = useVerticalHydroReal(HYDRO_CONFIG);
  const { step: stepXZ } = useHydroMovementReal(HYDRO_CONFIG);

  // 방향 벡터 캐시
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  /*──────────────────────────── 키 입력 처리 ─────────────────────────────*/
  useEffect(() => {
    const dom = gl.domElement;

    const handleDown = (e) => {
      moveKeys.current[e.code] = true;

      if (e.code === "KeyE")
        ballastRef.current = Math.max(0, ballastRef.current - 1);
      if (e.code === "KeyR") ballastRef.current += 1;

      if (["Space", "ShiftLeft", "ShiftRight"].includes(e.code))
        e.preventDefault();
    };

    const handleUp = (e) => (moveKeys.current[e.code] = false);

    dom.tabIndex = 0;
    dom.focus();
    dom.addEventListener("keydown", handleDown, { passive: false });
    dom.addEventListener("keyup", handleUp, { passive: false });
    window.addEventListener("keydown", handleDown, { passive: false });
    window.addEventListener("keyup", handleUp, { passive: false });

    return () => {
      dom.removeEventListener("keydown", handleDown);
      dom.removeEventListener("keyup", handleUp);
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, [gl]);

  /*──────────────────────────── 초기 세팅 ─────────────────────────────*/
  useEffect(() => {
    scene.fog = new THREE.FogExp2("#a3d7ff", 0.015);
    gl.setClearColor("#87cefa", 1);
    camera.position.copy(SPAWN_POS);
    camera.lookAt(0, 1.5, 0);
    ready.current = true;
  }, [scene, gl, camera]);

  /*──────────────────────────── 물리 루프 ─────────────────────────────*/
  useFrame((_, dt) => {
    if (!ready.current) return;
    tRef.current += dt;

    // Trim 조정 (Space/Shift)
    if (moveKeys.current["Space"]) {
      trimRef.current = THREE.MathUtils.lerp(
        trimRef.current,
        HYDRO_CONFIG.trimMaxN,
        0.08
      );
    } else if (
      moveKeys.current["ShiftLeft"] ||
      moveKeys.current["ShiftRight"]
    ) {
      trimRef.current = THREE.MathUtils.lerp(
        trimRef.current,
        -HYDRO_CONFIG.trimMaxN,
        0.08
      );
    } else {
      trimRef.current = THREE.MathUtils.lerp(trimRef.current, 0, 0.1);
    }

    // 수직 계산
    const res = stepY({
      dt,
      y: yRef.current,
      vy: vyRef.current,
      weightCount: ballastRef.current,
      bounds: { minY: 1.5, maxY: 12.0 },
      speedXZ: 0,
      t: tRef.current,
    });

    vyRef.current = res.newVy;
    yRef.current = res.newY;

    // 수평 이동
    const deltaXZ = stepXZ({
      dt,
      camera,
      moveKeys: moveKeys.current,
      effMass: Math.max(100, res.totalMass ?? 180),
    });

    if (!Number.isFinite(deltaXZ.x)) deltaXZ.x = 0;
    if (!Number.isFinite(deltaXZ.y)) deltaXZ.y = 0;

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, up).normalize();

    camera.position.x += deltaXZ.x;
    camera.position.z += deltaXZ.y;
    camera.position.y = yRef.current;

    // 링 근접 시 완료 이벤트
    const dist = camera.position.distanceTo(RING_POS);
    if (dist < 2.0) onRepairComplete?.();

    onPositionUpdate?.({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      depth: res.depth ?? 0,
      buoyancy: res.buoyancyN ?? 0,
      weight: res.weightN ?? 0,
      trim: trimRef.current,
      ballast: ballastRef.current,
    });
  });

  return (
    <>
      <primitive object={pool} />
      <mesh position={RING_POS} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.02, 16, 64]} />
        <meshStandardMaterial
          color={RING_COLOR}
          emissive={RING_COLOR}
          emissiveIntensity={1.3}
          roughness={0.35}
        />
      </mesh>
    </>
  );
}

/*──────────────────────────── Stage3 Wrapper ─────────────────────────────*/
export default function Stage3() {
  const [locked, setLocked] = useState(false);
  const [repaired, setRepaired] = useState(false);

  return (
    <div
      className="stage3-wrapper"
      style={{ position: "fixed", inset: 0, background: "#000" }}
    >
      {!locked && (
        <div
          className="lock-hint"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0,0,0,0.7)",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "10px",
            cursor: "pointer",
            zIndex: 10,
          }}
          onClick={() =>
            document
              .querySelector("canvas")
              ?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
          }
        >
          클릭해서 시작 (WASD / Space·Shift / E·R 부력 조정)
        </div>
      )}

      <div
        className="quest-panel"
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 10,
          color: "white",
          fontFamily: "monospace",
          background: "rgba(0,0,0,0.5)",
          padding: "10px 15px",
          borderRadius: "10px",
        }}
      >
        <h3>Stage 3 — 수중 해치 조작 훈련</h3>
        <div>{repaired ? "✅ 미션 완료" : "빨간 링 근처로 이동하세요"}</div>
        <hr />
        <div id="coord" style={{ lineHeight: "1.2em" }}></div>
      </div>

      <Canvas
        camera={{ position: [SPAWN_POS.x, SPAWN_POS.y, SPAWN_POS.z], fov: 60 }}
      >
        <Suspense fallback={null}>
          <Stage3Inner
            onPositionUpdate={(v) => {
              const el = document.getElementById("coord");
              if (el)
                el.innerHTML = `
                  <div>X: ${v.x.toFixed(2)}</div>
                  <div>Y: ${v.y.toFixed(2)}</div>
                  <div>Z: ${v.z.toFixed(2)}</div>
                  <div>Depth: ${v.depth.toFixed(2)} m</div>
                  <div>ΔF(B-W): ${(v.buoyancy - v.weight).toFixed(2)} N</div>
                  <div>Trim: ${v.trim.toFixed(2)} N</div>
                  <div>Ballast: ${v.ballast}</div>`;
            }}
            onRepairComplete={() => setRepaired(true)}
          />
          <Environment preset="sunset" />
        </Suspense>
        <PointerLockControls
          onLock={() => setLocked(true)}
          onUnlock={() => setLocked(false)}
        />
      </Canvas>
    </div>
  );
}
