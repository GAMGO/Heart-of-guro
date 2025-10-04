import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSim } from "./SimContext";
import useHydroMovementReal from "../physics/useHydroMovementReal";
import useVerticalHydroReal from "../physics/useVerticalHydroReal";
import { HYDRO_CONFIG } from "../physics/hydroConfig";

function expandBox(box, r, hh) {
  return new THREE.Box3(
    new THREE.Vector3(box.min.x - r, box.min.y - hh, box.min.z - r),
    new THREE.Vector3(box.max.x + r, box.max.y + hh, box.max.z + r)
  );
}
function inside(p, b) {
  return p.x > b.min.x && p.x < b.max.x && p.y > b.min.y && p.y < b.max.y && p.z > b.min.z && p.z < b.max.z;
}
function collides(centerPos, boxes, radius, halfH) {
  for (let i = 0; i < boxes.length; i++) if (inside(centerPos, expandBox(boxes[i], radius, halfH))) return true;
  return false;
}
function clampXZ(p, world, r) {
  p.x = Math.min(Math.max(p.x, world.minX + r), world.maxX - r);
  p.z = Math.min(Math.max(p.z, world.minZ + r), world.maxZ - r);
  return p;
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
    if (rig.current) rig.current.position.set(spawn.x, spawn.y - headOffset, spawn.z);
    camera.position.set(0, headOffset, 0);
    if (rig.current) rig.current.add(camera);
    ready.current = true;
  }, [camera, spawn, headOffset]);

  useEffect(() => {
    const kd = (e) => {
      keys.current[e.code] = true;
      if (e.code === "KeyE") setBallast((v) => Math.max(0, v - 1));
      if (e.code === "KeyR") setBallast((v) => v + 1);
      if (["Space", "ShiftLeft", "ShiftRight"].includes(e.code)) e.preventDefault();
    };
    const ku = (e) => (keys.current[e.code] = false);
    const dom = gl.domElement;
    dom.tabIndex = 0;
    dom.focus();
    dom.addEventListener("keydown", kd, { passive: false });
    dom.addEventListener("keyup", ku, { passive: false });
    window.addEventListener("keydown", kd, { passive: false });
    window.addEventListener("keyup", ku, { passive: false });
    return () => {
      dom.removeEventListener("keydown", kd);
      dom.removeEventListener("keyup", ku);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [gl, setBallast]);

  useFrame((_, dt) => {
    if (!ready.current || !rig.current) return;
    tRef.current += dt;

    const res = stepY({ dt, y: headYRef.current, vy: vyRef.current, weightCount: ballast, bounds: { minY: bounds.minY, maxY: bounds.maxY }, speedXZ: 0, t: tRef.current });
    vyRef.current = res.newVy;
    headYRef.current = res.newY;

    const d = stepXZ({ dt, camera, moveKeys: keys.current, effMass: Math.max(100, res.totalMass ?? 180) });

    const cur = rig.current.position.clone();
    const next = cur.clone();

    if (Number.isFinite(d.x)) {
      const tryX = cur.clone();
      tryX.x += d.x;
      clampXZ(tryX, bounds, radius);
      if (!collides(tryX, colliders, radius, halfH)) next.x = tryX.x;
    }
    if (Number.isFinite(d.y)) {
      const tryZ = next.clone();
      tryZ.z += d.y;
      clampXZ(tryZ, bounds, radius);
      if (!collides(tryZ, colliders, radius, halfH)) next.z = tryZ.z;
    }

    const headTarget = Math.min(Math.max(headYRef.current, bounds.minY), bounds.maxY);
    const centerY = headTarget - headOffset;
    const tryY = next.clone();
    tryY.y = centerY;
    if (!collides(tryY, colliders, radius, halfH)) next.y = centerY;

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
//