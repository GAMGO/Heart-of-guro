import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";

useGLTF.preload("/pool.glb");

function PoolModel() {
  const { scene } = useGLTF("/pool.glb");
  return <primitive object={scene} />;
}

export default function Stage2() {
  return (
    <div className="stage2-canvas">
      <Canvas camera={{ position: [8, 2, 8], fov: 60 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[8, 12, 6]} intensity={1.1} />
        <Suspense fallback={null}>
          <PoolModel />
          <Environment preset="warehouse" />
        </Suspense>
      </Canvas>
    </div>
  );
}