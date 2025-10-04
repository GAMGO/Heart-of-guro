import React, { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Stars } from "@react-three/drei";
import * as THREE from "three";

// ✅ 큐폴라 모델
function CupolaModel({ onReady }) {
  const { scene } = useGLTF("/cupola.glb");
  const ref = useRef();

  useEffect(() => {
    if (ref.current && onReady) {
      const box = new THREE.Box3().setFromObject(ref.current);
      const center = new THREE.Vector3();
      box.getCenter(center);
      onReady(center);
    }
  }, [onReady]);

  return <primitive ref={ref} object={scene} scale={[1, 1, 1]} />;
}

// ✅ 지구 모델
function EarthModel() {
  const { scene } = useGLTF("/earth.glb");
  return (
    <primitive
      object={scene}
      scale={[1, 1, 1]}
      position={[0, 0, -5]} // 큐폴라 앞쪽 (창문 밖)
    />
  );
}

// ✅ 카메라 위치 및 시야 설정
function FixedCamera({ center }) {
  const { camera, controls } = useThree();

  useEffect(() => {
    if (center) {
      // 카메라 위치: 큐폴라 중심보다 살짝 뒤로 (내부 좌석 느낌)
      const camPos = new THREE.Vector3(center.x, center.y, center.z + 0.5);
      camera.position.copy(camPos);

      // 시야 중심은 창문 앞쪽
      const target = new THREE.Vector3(center.x, center.y, center.z - 0.3);
      camera.lookAt(target);
      camera.updateProjectionMatrix();

      if (controls) {
        controls.target.copy(target);
        controls.update();
      }
    }
  }, [center, camera, controls]);

  return null;
}

// ✅ 메인 씬
export default function CupolaScene() {
  const [center, setCenter] = useState(null);

  const handleCupolaReady = (center) => {
    setCenter(center);
  };

  return (
    <Canvas camera={{ fov: 70, near: 0.1, far: 100 }}>
      {/* 부드러운 조명 */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />

      <Suspense fallback={null}>
        <Stars radius={100} depth={50} count={3000} factor={4} fade />
        <Environment preset="sunset" />
        <CupolaModel onReady={handleCupolaReady} />
        <EarthModel />

        {center && <FixedCamera center={center} />}

        {center && (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            enableDamping={true}
            dampingFactor={0.1}
            rotateSpeed={0.5}
            minPolarAngle={Math.PI / 3.2} // 위 아래 제한 (조금 위, 아래만)
            maxPolarAngle={Math.PI / 1.6}
            minAzimuthAngle={-Math.PI / 3} // 좌우 시야 살짝만
            maxAzimuthAngle={Math.PI / 3}
          />
        )}
      </Suspense>
    </Canvas>
  );
}
