// src/components/stages/Stage3.jsx
import React, { Suspense, useMemo, useState, useRef } from "react";
import { Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { SimProvider } from "../../common/SimContext";
import StageShell from "../../common/StageShell";
import HUD from "../../common/HUD";
import Astronaut from "../../common/Astronaut";
import { HYDRO_CONFIG } from "../../physics/hydroConfig";

useGLTF.preload("/pool.glb");

const SPAWN = new THREE.Vector3(-1.02, 8.0, 15.06);
const RING_POS = new THREE.Vector3(-5.489, 0, -7.946);
const BOUNDS = { minX: -20, maxX: 20, minY: 1.5, maxY: 12, minZ: -25, maxZ: 25 };
const PLAYER_H = 1.75;
const PLAYER_R = 0.4;

function Pool({ onColliders }) {
  const { scene } = useGLTF("/pool.glb");
  useMemo(() => {
    const boxes = [];
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const n = (o.name || "").toLowerCase();
      if (n.includes("collision") || n.includes("collider") || n.startsWith("col_") || o.userData?.collider === true) {
        o.visible = false;
        o.updateWorldMatrix(true, true);
        const b = new THREE.Box3().setFromObject(o);
        boxes.push(b);
      }
    });
    onColliders(boxes);
  }, [scene, onColliders]);
  return <primitive object={scene} />;
}

export default function Stage3() {
  const [colliders, setColliders] = useState([]);
  const shellCam = useRef({ position: [SPAWN.x, SPAWN.y, SPAWN.z], fov: 60 });
  return (
    <SimProvider initialBallast={HYDRO_CONFIG.ballastKg}>
      <StageShell camera={shellCam.current} envPreset="sunset" title={<HUD title="Stage 3" extra={null} />}>
        <Suspense fallback={null}>
          <Pool onColliders={setColliders} />
          <Astronaut
            spawn={SPAWN}
            bounds={BOUNDS}
            headOffset={PLAYER_H * 0.5}
            height={PLAYER_H}
            radius={PLAYER_R}
            colliders={colliders}
            config={HYDRO_CONFIG}
          />
          <mesh position={RING_POS} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.8, 0.02, 16, 64]} />
            <meshStandardMaterial color="#ff4040" emissive="#ff4040" emissiveIntensity={1.3} roughness={0.35} />
          </mesh>
          <Environment preset="sunset" />
        </Suspense>
      </StageShell>
    </SimProvider>
  );
}
