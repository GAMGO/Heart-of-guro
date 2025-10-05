import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, PointerLockControls } from "@react-three/drei";
import { autoGenerateLights } from "../../assets/AutoLightGenarator.js";
import { WaterController } from '../../assets/WaterShade.js';
import * as THREE from "three";

// 풀 장면
function Pool() {
  const { scene } = useGLTF("./pool.glb");
  useEffect(() => {
    autoGenerateLights(
        scene, 
        2,            // offset
        Math.PI / 6,  // angle
        0.5           // penumbra
    );
}, [scene]);
  return <primitive object={scene} scale={1} />;
}

function SimController({ pos, floats, weights, target, onNeutral }) {
  const { camera } = useThree();
  const ref = useRef();
  const vyRef = useRef(0);
  const vxRef = useRef(0);
  const vzRef = useRef(0);
  const lastRef = useRef(performance.now());
  const neutralTimer = useRef(0);

  const keys = useRef({ w: false, a: false, s: false, d: false });
  useEffect(() => {
    const down = (e) => {
      if (e.code === "KeyW") keys.current.w = true;
      if (e.code === "KeyS") keys.current.s = true;
      if (e.code === "KeyA") keys.current.a = true;
      if (e.code === "KeyD") keys.current.d = true;
    };
    const up = (e) => {
      if (e.code === "KeyW") keys.current.w = false;
      if (e.code === "KeyS") keys.current.s = false;
      if (e.code === "KeyA") keys.current.a = false;
      if (e.code === "KeyD") keys.current.d = false;
    };
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("keyup", up);
    };
  }, []);

  useFrame(() => {
    const now = performance.now();
    const dt = (now - lastRef.current) / 1000;
    lastRef.current = now;

    // ---- 상하 힘 계산 (부표=추 균형) ----
    const unitPower = 20;
    const forceY = floats * unitPower - weights * unitPower;
    const accY = forceY / 80;
    vyRef.current += accY * dt;

    // ---- WASD 이동 ----
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let inputX = 0,
      inputZ = 0;
    if (keys.current.w) {
      inputX += forward.x;
      inputZ += forward.z;
    }
    if (keys.current.s) {
      inputX -= forward.x;
      inputZ -= forward.z;
    }
    if (keys.current.d) {
      inputX += right.x;
      inputZ += right.z;
    }
    if (keys.current.a) {
      inputX -= right.x;
      inputZ -= right.z;
    }

    const speed = 2;
    vxRef.current += inputX * speed * dt;
    vzRef.current += inputZ * speed * dt;

    vxRef.current *= 0.9;
    vzRef.current *= 0.9;

    // ---- 위치 업데이트 ----
    pos.current.x += vxRef.current * dt;
    pos.current.z += vzRef.current * dt;
    pos.current.y += vyRef.current * dt;

    if (pos.current.y < 1.75) {
      pos.current.y = 1.75;
      vyRef.current = 0;
    }

    const camY = Math.max(1.75, pos.current.y + 0.2);
    camera.position.set(pos.current.x, camY, pos.current.z);

    if (ref.current) {
      ref.current.position.set(pos.current.x, pos.current.y, pos.current.z);
    }

    // ---- 중성부력 체크 ----
    if (floats === weights && Math.abs(pos.current.y - target) < 0.1) {
      neutralTimer.current += dt;
      if (neutralTimer.current >= 3) onNeutral();
    } else {
      neutralTimer.current = 0;
    }
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

export default function Stage1() {
  const pos = useRef({ x: 0, y: 1.75, z: 0 });
  const [floats, setFloats] = useState(5); // 시작 = 5
  const [weights, setWeights] = useState(5); // 시작 = 5 → 중성부력
  const [target] = useState(() => 1.8 + Math.random() * 1.5);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    const down = (e) => {
      if (e.code === "Space" && floats < 10) {
        setFloats((f) => f + 1);
        setWeights((w) => Math.max(0, w - 1));
      }
      if (e.code === "ShiftLeft" && weights < 10) {
        setWeights((w) => w + 1);
        setFloats((f) => Math.max(0, f - 1));
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [floats, weights]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [0, 2, 6], fov: 75 }}>
        <WaterController /> 
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <Pool />
        <SimController
          pos={pos}
          floats={floats}
          weights={weights}
          target={target}
          onNeutral={() => setCleared(true)}
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
        <p>🎮 Controls:</p>
        <p>WASD → Swim horizontally</p>
        <p>Space → Add Float (부표 ↑)</p>
        <p>Shift → Add Weight (추 ↑)</p>
        <hr />
        <p>🟡 Floats: {floats}</p>
        <p>⚖️ Weights: {weights}</p>
        <p>📍 Y: {pos.current.y.toFixed(2)} m</p>
        <p>🎯 Target: {target.toFixed(2)} m</p>
        {cleared && <h3>✅ Neutral Buoyancy Cleared!</h3>}
      </div>
    </div>
  );
}
