import "./Cupola.css";
import React, { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, useGLTF, Stars } from "@react-three/drei";
import * as THREE from "three";

const CUPOLA_PRE_PITCH_DEG = 0;
const CUPOLA_PRE_YAW_DEG = 90;
const CUPOLA_PRE_ROLL_DEG = 0;
const CUPOLA_ROLL_FIX_DEG = 0;

function FixedCameraInside() {
  const { camera, gl } = useThree();
  
  const camPos = new THREE.Vector3(0, 0.8, 0);

  const yawRef = useRef(0);
  const pitchRef = useRef(0);

  const lookDist = 2.4;               
  const baseYOffset = 0.2;        
  const pitchNeutralDeg = -12;   

  const curDir = useRef(new THREE.Vector3(0, 0, -1));
  const lerpFactor = 0.15;

 useEffect(() => {
    camera.position.copy(camPos);
    camera.fov = 80;
    camera.updateProjectionMatrix();

    const sensitivity = 0.0025;
    let lastX = null, lastY = null;

    const onMove = (e) => {
      if (lastX === null) { lastX = e.clientX; lastY = e.clientY; return; }
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;

      yawRef.current   += dx * sensitivity;
      pitchRef.current += -dy * sensitivity;

      const maxPitch = THREE.MathUtils.degToRad(70);
      pitchRef.current = Math.max(-maxPitch, Math.min(maxPitch, pitchRef.current));
    };

    const onLeave = () => { lastX = null; lastY = null; };
    gl.domElement.addEventListener("mousemove", onMove);
    gl.domElement.addEventListener("mouseleave", onLeave);
    return () => {
      gl.domElement.removeEventListener("mousemove", onMove);
      gl.domElement.removeEventListener("mouseleave", onLeave);
    };
  }, [camera, gl]);

  useFrame(() => {
    const yaw = yawRef.current;
    const pitch = pitchRef.current + THREE.MathUtils.degToRad(pitchNeutralDeg);

    const targetDir = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch)
    );

    curDir.current.lerp(targetDir, lerpFactor);

    camera.position.copy(camPos);
    const look = new THREE.Vector3().copy(camPos).add(
      new THREE.Vector3(
        curDir.current.x * lookDist,
        curDir.current.y * lookDist + baseYOffset,
        curDir.current.z * lookDist
      )
    );
    camera.lookAt(look);
  });

  return null;
}

function CupolaModel() {
  const { scene } = useGLTF("/cupola.glb");
  const ref = useRef();

  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(CUPOLA_PRE_PITCH_DEG),
    THREE.MathUtils.degToRad(CUPOLA_PRE_YAW_DEG),
    THREE.MathUtils.degToRad(CUPOLA_PRE_ROLL_DEG + CUPOLA_ROLL_FIX_DEG),
    "YXZ"
  );
  scene.rotation.copy(euler);

  return <primitive ref={ref} object={scene} scale={[1, 1, 1]} />;
}
useGLTF.preload("/cupola.glb");

function Earth() {
  const { scene } = useGLTF("/earth.glb");
  const ref = useRef();

  useEffect(() => {
    if (ref.current) {
      ref.current.position.set(0, 1.2, -10);
      ref.current.scale.set(2, 2, 2);
    }
  }, []);

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.0005;
    }
  });

  return <primitive ref={ref} object={scene} />;
}
useGLTF.preload("/earth.glb");

export default function Cupola() {
  return (
    <div className="fullscreen-canvas">
      <Canvas shadows camera={{ fov: 75, near: 0.1, far: 1000 }}>
        <Suspense fallback={<Html center>Loading…</Html>}>
          <FixedCameraInside />
          <ambientLight intensity={0.4} />
          <Stars radius={200} depth={60} count={10000} factor={4} fade />
          <Environment preset="night" background />
          <CupolaModel />
          <Earth />
        </Suspense>
      </Canvas>
    </div>
  );
}
