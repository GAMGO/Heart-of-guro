// src/common/Astronaut.jsx
import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export default function Astronaut({
  spawn = new THREE.Vector3(0, 1.75, 0),
  headOffset = 10.0,
  moveSpeed = 10.0,
}) {
  const { camera } = useThree();
  const posRef = useRef(spawn.clone());
  const keys = useRef({});

  // 키 입력 등록
  useEffect(() => {
    const handleDown = (e) => (keys.current[e.code] = true);
    const handleUp = (e) => (keys.current[e.code] = false);
    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, []);

  // 프레임마다 이동
  useFrame((_, dt) => {
    const dir = new THREE.Vector3();
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .normalize();

    if (keys.current["KeyW"]) dir.add(forward);
    if (keys.current["KeyS"]) dir.sub(forward);
    if (keys.current["KeyA"]) dir.sub(right);
    if (keys.current["KeyD"]) dir.add(right);

    if (dir.lengthSq() > 0) {
      dir.normalize().multiplyScalar(moveSpeed * dt);
      posRef.current.add(dir);
    }

    camera.position.set(
      posRef.current.x,
      posRef.current.y + headOffset,
      posRef.current.z
    );
  });

  return null;
}
