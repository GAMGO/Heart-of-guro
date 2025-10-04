// src/common/Astronaut.jsx
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSim } from "./SimContext";
import useHydroMovementReal from "../physics/useHydroMovementReal";
import useVerticalHydroReal from "../physics/useVerticalHydroReal";
import { HYDRO_CONFIG } from "../physics/hydroConfig";

function expandBox(box, r, hh) {
  return new THREE.Box3(
    new THREE.Vector3(box.min.x - r, box.min.y - hh * 0.6, box.min.z - r),
    new THREE.Vector3(box.max.x + r, box.max.y + hh * 0.6, box.max.z + r)
  );
}
function inside(p, b) {
  return p.x > b.min.x && p.x < b.max.x && p.y > b.min.y && p.y < b.max.y && p.z > b.min.z && p.z < b.max.z;
}
function clampXZ(p, world, r) {
  p.x = Math.min(Math.max(p.x, world.minX + r), world.maxX - r);
  p.z = Math.min(Math.max(p.z, world.minZ + r), world.maxZ - r);
  return p;
}
function resolvePenetration(center, boxes, radius, halfH, maxIters = 6) {
  let pos = center.clone();
  const eps = 1e-4;
  for (let k = 0; k < maxIters; k++) {
    let pushed = false;
    for (let i = 0; i < boxes.length; i++) {
      const e = expandBox(boxes[i], radius, halfH);
      if (!inside(pos, e)) continue;
      const dxMin = e.min.x - pos.x;
      const dxMax = e.max.x - pos.x;
      const dyMin = e.min.y - pos.y;
      const dyMax = e.max.y - pos.y;
      const dzMin = e.min.z - pos.z;
      const dzMax = e.max.z - pos.z;
      const cand = [
        { axis: "x", v: dxMin },
        { axis: "x", v: dxMax },
        { axis: "y", v: dyMin },
        { axis: "y", v: dyMax },
        { axis: "z", v: dzMin },
        { axis: "z", v: dzMax },
      ].sort((a, b) => Math.abs(a.v) - Math.abs(b.v))[0];
      if (cand.axis === "x") pos.x += cand.v + Math.sign(cand.v) * eps;
      if (cand.axis === "y") pos.y += cand.v + Math.sign(cand.v) * eps;
      if (cand.axis === "z") pos.z += cand.v + Math.sign(cand.v) * eps;
      pushed = true;
    }
    if (!pushed) break;
  }
  return pos;
}

export default function Astronaut({
  spawn = new THREE.Vector3(0, 1.8, 0),
  bounds = { minX: -10, maxX: 10, minY: 1.5, maxY: 12, minZ: -10, maxZ: 10 },
  headOffset = 0.85,
  height = 1.8,
  radius = 0.38,
  colliders = [],
  config = HYDRO_CONFIG,
}) {
  const { camera, gl } = useThree();
  const { posRef, ballast, setBallast } = useSim();
  const rig = useRef(null);
  const keys = useRef({});
  const headYRef = useRef(spawn.y);
  const vyRef = useRef(0);
  const tRef = useRef(0);
  const { stepY } = useVerticalHydroReal(config);
  const { step: stepXZ } = useHydroMovementReal(config);
  const ready = useRef(false);
  const halfH = height * 0.5;

  useEffect(() => {
    if (!rig.current) return;
    const cy = Math.max(spawn.y - headOffset, halfH + 1e-3);
    rig.current.position.set(spawn.x, cy, spawn.z);
    camera.position.set(0, headOffset, 0);
    rig.current.add(camera);
    ready.current = true;
  }, [camera, spawn, headOffset, halfH]);

  useEffect(() => {
    if (!rig.current || colliders.length === 0) return;
    const c = new THREE.Vector3(rig.current.position.x, rig.current.position.y, rig.current.position.z);
    const safe = resolvePenetration(c, colliders, radius, halfH);
    safe.y = Math.max(safe.y, halfH + 1e-3);
    rig.current.position.copy(safe);
    headYRef.current = safe.y + headOffset;
  }, [colliders, radius, halfH, headOffset]);

  useEffect(() => {
    const kd = (e) => {
      keys.current[e.code] = true;
      if (e.code === "KeyE") setBallast((v) => Math.max(0, v - 1));
      if (e.code === "KeyR") setBallast((v) => v + 1);
      if (["Space", "ShiftLeft", "ShiftRight"].includes(e.code)) e.preventDefault();
    };
    const ku = (e) => (keys.current[e.code] = false);
    const clearOnBlur = () => { keys.current = {}; };
    const enableLock = () => {
      if (gl?.domElement && document.pointerLockElement !== gl.domElement) gl.domElement.requestPointerLock();
    };
    if (gl?.domElement) {
      gl.domElement.setAttribute("tabindex", "0");
      gl.domElement.addEventListener("click", enableLock);
      gl.domElement.addEventListener("keydown", kd, { passive: false });
      gl.domElement.addEventListener("keyup", ku, { passive: false });
    }
    document.addEventListener("keydown", kd, { passive: false });
    document.addEventListener("keyup", ku, { passive: false });
    window.addEventListener("blur", clearOnBlur);
    return () => {
      if (gl?.domElement) {
        gl.domElement.removeEventListener("click", enableLock);
        gl.domElement.removeEventListener("keydown", kd);
        gl.domElement.removeEventListener("keyup", ku);
      }
      document.removeEventListener("keydown", kd);
      document.removeEventListener("keyup", ku);
      window.removeEventListener("blur", clearOnBlur);
    };
  }, [gl, setBallast]);

  useFrame((_, dt) => {
    if (!ready.current || !rig.current) return;
    tRef.current += dt;

    const res = stepY({ dt, y: headYRef.current, vy: vyRef.current, weightCount: ballast, bounds: { minY: bounds.minY, maxY: bounds.maxY }, speedXZ: 0, t: tRef.current });
    vyRef.current = res.newVy;
    headYRef.current = res.newY;

    const d = stepXZ({ dt, camera, moveKeys: keys.current, effMass: Math.max(100, res.totalMass ?? 180) });

    let next = rig.current.position.clone();

    if (Number.isFinite(d.x)) {
      next.x += d.x;
      clampXZ(next, bounds, radius);
      next = resolvePenetration(next, colliders, radius, halfH);
    }
    if (Number.isFinite(d.y)) {
      next.z += d.y;
      clampXZ(next, bounds, radius);
      next = resolvePenetration(next, colliders, radius, halfH);
    }

    const headTarget = Math.min(Math.max(headYRef.current, bounds.minY), bounds.maxY);
    let centerY = headTarget - headOffset;
    centerY = Math.max(centerY, halfH + 1e-3);
    next.y = centerY;
    next = resolvePenetration(next, colliders, radius, halfH);

    rig.current.position.copy(next);
    posRef.current = { x: next.x, y: next.y + headOffset, z: next.z };
  });

  return (
    <group ref={rig}>
      <mesh visible={false} position={[0, 0, 0]}>
        <capsuleGeometry args={[radius, height - 2 * radius, 8, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}
