import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center, useGLTF, Environment } from "@react-three/drei";
import "./Stage3.css";          
import * as THREE from "three";

function PoolModel(props) {
  const { scene } = useGLTF("/pool.glb");

  scene.traverse((o) => {
    if (!o.isMesh) return;
    const name = (o.name || "").toLowerCase();
    if (name.includes("collider") || name.includes("collision")) {
      o.visible = false;
    }
    const c = o.material?.color;
    if (c && Math.abs(c.r - 1) + Math.abs(c.g - 0) + Math.abs(c.b - 1) < 0.4) {
      o.visible = false;
      if (o.material) {
        o.material.transparent = true;
        o.material.opacity = 0;
        o.material.depthWrite = false;
        o.material.colorWrite = false;
      }
    }
  });

  return <primitive object={scene} {...props} />;
}
useGLTF.preload("/pool.glb");

export default function Stage3() {
  return (
    <div className="stage3-canvas">
      <Canvas camera={{ position: [8, 5, 12], fov: 50 }} shadows>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
        <Suspense fallback={null}>
          <Center>
            <PoolModel />
          </Center>
          <Environment preset="warehouse" />
        </Suspense>
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
