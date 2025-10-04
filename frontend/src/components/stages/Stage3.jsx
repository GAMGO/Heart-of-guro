import React, { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Bounds, Center, Environment, Html } from "@react-three/drei";
import "./Stage3.css";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

function DebugScene() {
  const grid = useMemo(() => new THREE.GridHelper(20, 20, 0x666666, 0x333333), []);
  const axes = useMemo(() => new THREE.AxesHelper(2), []);
  return (
    <>
      <primitive object={grid} />
      <primitive object={axes} />
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </mesh>
    </>
  );
}

function PoolModel() {
  const base = (import.meta?.env?.BASE_URL || "/").replace(/\/+$/, "/");
  const url = `${base}pool.glb`;

  const Model = useMemo(() => {
    const group = new THREE.Group();
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath(`${base}draco/`);
    loader.setDRACOLoader(draco);
    loader.load(
      url,
      (gltf) => {
        gltf.scene.traverse((o) => {
          if (!o.isMesh) return;
          const name = (o.name || "").toLowerCase();
          if (name.includes("collider") || name.includes("collision")) o.visible = false;
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
        group.add(gltf.scene);
      },
      undefined,
      (err) => console.error("[GLB] attach error:", err)
    );
    return group;
  }, [url, base]);

  return (
    <Bounds fit clip observe margin={1.2}>
      <Center disableY>
        <primitive object={Model} />
      </Center>
    </Bounds>
  );
}

export default function Stage3() {
  return (
    <div className="stage3-canvas">
      <Canvas camera={{ position: [10, 6, 14], fov: 45 }} shadows gl={{ antialias: true }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[8, 12, 6]} intensity={1.2} castShadow />
        <Suspense fallback={<Html center style={{ color: "#fff" }}>loading pool.glb…</Html>}>
          <PoolModel />
          <Environment preset="warehouse" />
        </Suspense>
        <DebugScene />
        <OrbitControls makeDefault enableDamping />
      </Canvas>
    </div>
  );
}
