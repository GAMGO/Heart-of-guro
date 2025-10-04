import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, PointerLockControls } from "@react-three/drei";
import * as THREE from "three";

import useHydroMovementReal from "../../physics/useHydroMovementReal";
import useVerticalHydroReal from "../../physics/useVerticalHydroReal";
import { HYDRO_CONFIG } from "../../physics/hydroConfig";

// ---------- Pool ----------
function Pool() {
  const { scene } = useGLTF("/pool.glb");
  return <primitive object={scene} scale={1} />;
}

// ---------- SimController ----------
function SimController({ pos, weights, target }) {
  const { camera, clock } = useThree();
  const moveKeys = useRef({});
  const ref = useRef();

  // ✅ 전역 키 입력
  useEffect(() => {
    const kd = (e) => {
      moveKeys.current[e.code] = true;
      if (["Space", "ShiftLeft", "ShiftRight"].includes(e.code))
        e.preventDefault();
    };
    const ku = (e) => (moveKeys.current[e.code] = false);
    window.addEventListener("keydown", kd, { passive: false });
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, []);

  // ✅ 수평 / 수직 이동 훅
  const { step: stepXZ } = useHydroMovementReal(HYDRO_CONFIG);
  const { stepY } = useVerticalHydroReal(HYDRO_CONFIG);

  const vyRef = useRef(0);
  const yRef = useRef(pos.current.y);

  useFrame((_, dt) => {
    const t = clock.getElapsedTime();

    // 수직 이동
    const res = stepY({
      dt,
      y: yRef.current,
      vy: vyRef.current,
      weightCount: weights,
      bounds: { minY: 1.75, maxY: 12.0 },
      speedXZ: 0,
      t,
    });
    yRef.current = res.newY;
    vyRef.current = res.newVy;

    // 수평 이동
    const dXZ = stepXZ({
      dt,
      camera,
      moveKeys: moveKeys.current,
      effMass: Math.max(100, (res.totalMass ?? 180) * 0.7),
      bounds: null,
    });

    if (isNaN(dXZ.x) || isNaN(dXZ.y)) return; // 안전장치
    camera.position.x += dXZ.x;
    camera.position.z += dXZ.y;
    camera.position.y = yRef.current;

    pos.current.set(camera.position.x, yRef.current, camera.position.z);
    if (ref.current) ref.current.position.copy(camera.position);
  });

  return (
    <>
      <mesh ref={ref}>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshStandardMaterial color="orange" />
      </mesh>
      <mesh position={[0, target, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="yellow" />
      </mesh>
    </>
  );
}

// ---------- Stage1 ----------
export default function Stage1() {
  const pos = useRef(new THREE.Vector3(0, 1.75, 0));
  const [weights, setWeights] = useState(HYDRO_CONFIG.ballastKg);
  const [target] = useState(() => 1.8 + Math.random() * 1.5);
  const [locked, setLocked] = useState(false);

  // 🎛️ E/R 부력 조절
  useEffect(() => {
    const down = (e) => {
      if (e.code === "KeyE") setWeights((w) => Math.max(0, w - 1));
      if (e.code === "KeyR") setWeights((w) => w + 1);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {!locked && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0,0,0,0.6)",
            color: "white",
            padding: "12px 18px",
            borderRadius: "8px",
            fontFamily: "sans-serif",
          }}
        >
          클릭해서 조작 시작 (WASD 이동, Space/Shift 상승·하강, E/R 부력 조정)
        </div>
      )}

      <Canvas camera={{ position: [0, 2, 6], fov: 75 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <Pool />
        <SimController pos={pos} weights={weights} target={target} />
        <PointerLockControls
          onLock={() => setLocked(true)}
          onUnlock={() => setLocked(false)}
        />
      </Canvas>

      {/* HUD */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          background: "rgba(0,0,0,0.6)",
          color: "white",
          padding: "10px 15px",
          borderRadius: "8px",
          fontFamily: "monospace",
        }}
      >
        <p>🎮 Controls</p>
        <p>WASD → 수영 / Space·Shift → 상승·하강</p>
        <p>E → 추 제거 (↑ 부력)</p>
        <p>R → 추 추가 (↓ 부력)</p>
        <hr />
        <p>⚖️ Weights: {weights}</p>
        <p>📍 Y: {pos.current.y.toFixed(2)} m</p>
        <p>🎯 Target: {target.toFixed(2)} m</p>
        {Math.abs(pos.current.y - target) < 0.1 && (
          <h3>✅ Neutral-ish depth!</h3>
        )}
      </div>
    </div>
  );
}
