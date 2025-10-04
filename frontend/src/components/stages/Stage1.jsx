import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, PointerLockControls } from "@react-three/drei";
import useVerticalHydroReal from "../../physics/useVerticalHydroReal";
import { buildEmuNblConfig } from "../../physics/nasaPresets";
import * as THREE from "three";

// 풀 장면
function Pool() {
  const { scene } = useGLTF("./pool.glb");
  return <primitive object={scene} scale={1} />;
}

// 시뮬레이터 제어 (x/z는 sim, y는 Stage1에서 관리)
function SimController({ sim, floats, weights, onNeutral }) {
  const ref = useRef();
  const { camera } = useThree();
  const timeRef = useRef(0);
  const vyRef = useRef(0); // Stage1에서 따로 관리하는 y속도

  useFrame((_, dt) => {
    timeRef.current += dt;

    // 카메라 forward/right 계산
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    // 1) sim으로 x/z 이동만 업데이트
    sim.step(dt, forward, right);

    // 2) floats/weights 기반 y축 부력 계산
    let diff = floats - weights;
    let buoyancyForce = diff * 2.0;

    // 중성부력 근처에서 살짝 흔들림
    if (Math.abs(diff) < 1) {
      buoyancyForce += Math.sin(timeRef.current * 3) * 0.5;
    }

    // 3) vy 누적 → 계속 뜨거나 계속 가라앉음
    vyRef.current += buoyancyForce * dt;

    // 4) y 갱신
    sim.pos.y += vyRef.current * dt;

    // 카메라 위치
    camera.position.set(sim.pos.x, sim.pos.y + 0.2, sim.pos.z);

    if (ref.current) {
      ref.current.position.set(sim.pos.x, sim.pos.y, sim.pos.z);
    }

    if (onNeutral) onNeutral(sim.pos.y, diff);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.3, 24, 24]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export default function Stage1() {
  const [floats, setFloats] = useState(0);
  const [weights, setWeights] = useState(5); // 시작할 때 추 5개 → 자동 가라앉음
  const maxFloats = 10;
  const maxWeights = 10;

  const sim = useVerticalHydroReal(buildEmuNblConfig({}));

  // 랜덤 목표 깊이 (1~4m)
  const [targetDepth] = useState(() => (Math.random() * 3 + 1).toFixed(1));
  const [timer, setTimer] = useState(3);
  const [cleared, setCleared] = useState(false);
  const timerRef = useRef(null);

  // 키 입력 처리
  useEffect(() => {
    const down = (e) => {
      if (e.code === "Space" && floats < maxFloats) {
        setFloats((f) => f + 1);
        setWeights((w) => Math.max(0, w - 1));
      }
      if (e.code === "ShiftLeft" && weights < maxWeights) {
        setWeights((w) => w + 1);
        setFloats((f) => Math.max(0, f - 1));
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [floats, weights]);

  // 중성부력 체크
  const handleNeutral = (y, diff) => {
    if (cleared) return;
    if (Math.abs(y - targetDepth) < 0.2 && Math.abs(diff) < 1) {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setTimer((t) => {
            if (t <= 1) {
              clearInterval(timerRef.current);
              timerRef.current = null;
              setCleared(true);
              return 0;
            }
            return t - 1;
          });
        }, 1000);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setTimer(3);
      }
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [0, 2, 6], fov: 75 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />

        <Pool />

        <SimController
          sim={sim}
          floats={floats}
          weights={weights}
          onNeutral={handleNeutral}
        />

        <PointerLockControls />
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
        <p>
          ⚖️ Floats: {floats} | Weights: {weights}
        </p>
        <p>
          {floats > weights
            ? "🟦 Positive Buoyancy (Rising)"
            : weights > floats
            ? "🟥 Negative Buoyancy (Sinking)"
            : "🟨 Neutral Buoyancy (Stable)"}
        </p>
        <p>🎯 Target Depth: {targetDepth} m</p>
        {!cleared && <p>⏳ Hold Neutral: {timer} s</p>}
        {cleared && <h3>✅ Mission Cleared!</h3>}
        <hr />
        <p>[SPACE] Add Float (↑)</p>
        <p>[SHIFT] Add Weight (↓)</p>
        <p>[WASD] Move | [Mouse] Look Around</p>
      </div>
    </div>
  );
}
