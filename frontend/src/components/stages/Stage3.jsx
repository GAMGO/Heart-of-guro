import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import useVerticalHydroReal from "../../physics/useVerticalHydroReal";
import { buildEmuNblConfig } from "../../physics/nasaPresets";
import useWaterField from "../../physics/useWaterField";
import "./Stage3.css";

useGLTF.preload("/pool.glb");

function useKeys() {
  const keys = useRef({ w: false, a: false, s: false, d: false, shift: false });
  useEffect(() => {
    const down = (e) => {
      switch (e.code) {
        case "KeyW": keys.current.w = true; e.preventDefault(); break;
        case "KeyA": keys.current.a = true; e.preventDefault(); break;
        case "KeyS": keys.current.s = true; e.preventDefault(); break;
        case "KeyD": keys.current.d = true; e.preventDefault(); break;
        case "ShiftLeft":
        case "ShiftRight": keys.current.shift = true; break;
        default: break;
      }
    };
    const up = (e) => {
      switch (e.code) {
        case "KeyW": keys.current.w = false; break;
        case "KeyA": keys.current.a = false; break;
        case "KeyS": keys.current.s = false; break;
        case "KeyD": keys.current.d = false; break;
        case "ShiftLeft":
        case "ShiftRight": keys.current.shift = false; break;
        default: break;
      }
    };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up, { passive: true });
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  return keys;
}

function Stage3Inner() {
  const { camera, gl } = useThree();
  const { scene: pool } = useGLTF("/pool.glb");
  const [ready, setReady] = useState(false);
  const worldBox = useRef(new THREE.Box3());
  const player = useRef(new THREE.Vector3());
  const keys = useKeys();
  const tmpDir = useMemo(() => new THREE.Vector3(), []);
  const tmpNext = useMemo(() => new THREE.Vector3(), []);
  const tmpMove = useMemo(() => new THREE.Vector3(), []);
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const minY = 1.75;
  const pad = 0.25;
  const ceilY = useRef(12);
  const hydro = useVerticalHydroReal(buildEmuNblConfig());
  const field = useWaterField();
  const camQuat = useRef(new THREE.Quaternion());
  const targetQuat = useRef(new THREE.Quaternion());
  const euler = useRef(new THREE.Euler());

  useEffect(() => {
    pool.updateMatrixWorld(true);
    pool.traverse((o) => {
      if (!o.isMesh) return;
      const name = (o.name || "").toLowerCase();
      const c = o.material?.color;
      const isMagenta = c && Math.abs(c.r - 1) + Math.abs(c.g - 0) + Math.abs(c.b - 1) < 0.4;
      if (name.includes("collider") || name.includes("collision") || isMagenta) o.visible = false;
    });
    worldBox.current.setFromObject(pool);
    const center = new THREE.Vector3();
    worldBox.current.getCenter(center);
    ceilY.current = worldBox.current.max.y - pad;
    player.current.set(center.x, minY, center.z);
    hydro.setY(minY);
    hydro.setVY(0);
    camera.position.copy(player.current);
    camQuat.current.copy(camera.quaternion);
    const dom = gl.domElement;
    const handleClick = () => dom.requestPointerLock?.();
    dom.addEventListener("click", handleClick);
    setReady(true);
    return () => {
      dom.removeEventListener("click", handleClick);
    };
  }, [pool, camera, gl, hydro]);

  useFrame((_, dt) => {
    if (!ready) return;
    field.step(dt);
    const base = keys.current.shift ? 3.5 : 2.0;
    const speed = base * dt;
    tmpDir.set(0, 0, 0);
    if (keys.current.w) tmpDir.z += 1;
    if (keys.current.s) tmpDir.z -= 1;
    if (keys.current.a) tmpDir.x += 1;
    if (keys.current.d) tmpDir.x -= 1;
    if (tmpDir.lengthSq() > 0) tmpDir.normalize();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() === 0) forward.set(0, 0, -1);
    forward.normalize();
    right.copy(up).cross(forward).normalize();
    const flow = field.sample(player.current.x, player.current.z);
    const move = tmpMove.set(0, 0, 0).addScaledVector(forward, tmpDir.z * speed).addScaledVector(right, tmpDir.x * speed).addScaledVector(new THREE.Vector3(flow.vx,0,flow.vz), dt);
    tmpNext.copy(player.current).add(move);
    const r = hydro.step(dt);
    let y = r.y + flow.vy*dt;
    if (y < minY) { y = minY; hydro.setY(y); hydro.setVY(0); }
    if (y > ceilY.current) { y = ceilY.current; hydro.setY(y); hydro.setVY(0); }
    const min = worldBox.current.min.clone().addScalar(pad);
    const max = worldBox.current.max.clone().addScalar(-pad);
    tmpNext.x = THREE.MathUtils.clamp(tmpNext.x, min.x, max.x);
    tmpNext.z = THREE.MathUtils.clamp(tmpNext.z, min.z, max.z);
    player.current.set(tmpNext.x, y, tmpNext.z);
    const tilt = field.cameraTiltFrom(flow.vx, flow.vz);
    euler.current.set(tilt.pitch, 0, tilt.roll, "ZYX");
    targetQuat.current.setFromEuler(euler.current);
    camQuat.current.slerp(targetQuat.current, Math.min(1, dt*2.5));
    camera.quaternion.multiplyQuaternions(camera.quaternion, camQuat.current);
    camera.position.lerp(player.current, Math.min(1, dt*10));
  });

  return <primitive object={pool} />;
}

export default function Stage3() {
  const [locked, setLocked] = useState(false);
  const ctrl = useRef(null);
  return (
    <div className="stage3-canvas">
      {!locked && <div className="lock-hint" onClick={() => ctrl.current?.lock()}>클릭해서 조작 시작 (WASD, Shift, 마우스로 시점)</div>}
      <Canvas camera={{ position: [8, 2, 8], fov: 60 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[8, 12, 6]} intensity={1.1} />
        <Suspense fallback={null}>
          <Stage3Inner />
          <Environment preset="warehouse" />
        </Suspense>
        <PointerLockControls ref={ctrl} onLock={() => setLocked(true)} onUnlock={() => setLocked(false)} />
      </Canvas>
    </div>
  );
}
