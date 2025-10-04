import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center, useGLTF, Environment } from "@react-three/drei";

function PoolModel(props) {
  const { scene } = useGLTF("/pool.glb");
  return <primitive object={scene} {...props} />;
}
useGLTF.preload("/pool.glb");

export default function Stage3() {
  return (
    <div style={{ width: "100%", height: "70vh", border: "1px solid #ddd" }}>
      <Canvas
        camera={{ position: [8, 5, 12], fov: 50 }}
        shadows
      >
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
