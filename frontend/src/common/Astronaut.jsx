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
  return (
    p.x > b.min.x &&
    p.x < b.max.x &&
    p.y > b.min.y &&
    p.y < b.max.y &&
    p.z > b.min.z &&
    p.z < b.max.z
  );
}

function clampXZ(p, world, r) {
  p.x = Math.min(Math.max(p.x, world.minX + r), world.maxX - r);
  p.z = Math.min(Math.max(p.z, world.minZ + r), world.maxZ - r);
  return p;
}

// ⛏️ 충돌 보정 (Y는 완전 차단하지 않고 살짝만 조정)
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
      const dzMin = e.min.z - pos.z;
      const dzMax = e.max.z - pos.z;

      // ✅ Y 방향은 밀어내지 않음 (부력 상승 방해 방지)
      const cand = [
        { axis: "x", v: dxMin },
        { axis: "x", v: dxMax },
        { axis: "z", v: dzMin },
        { axis: "z", v: dzMax },
      ].sort((a, b) => Math.abs(a.v) - Math.abs(b.v))[0];

      if (cand.axis === "x") pos.x += cand.v + Math.sign(cand.v) * eps;
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

  // ✅ 초기 카메라 설정
  useEffect(() => {
    if (rig.current) {
      rig.current.position.set(spawn.x, spawn.y - headOffset, spawn.z);
      camera.position.set(0, headOffset, 0);
      rig.current.add(camera);
    }
    ready.current = true;
  }, [camera, spawn, headOffset]);

  // ✅ 충돌 보정 초기화
  useEffect(() => {
    if (!rig.current || colliders.length === 0) return;
    const safe = resolvePenetration(
      rig.current.position,
      colliders,
      radius,
      halfH
    );
    rig.current.position.copy(safe);
    headYRef.current = safe.y + headOffset;
  }, [colliders, radius, halfH, headOffset]);

  // ✅ 키 입력
  useEffect(() => {
    const kd = (e) => {
      keys.current[e.code] = true;
      if (e.code === "KeyE") setBallast((v) => Math.max(0, v - 1));
      if (e.code === "KeyR") setBallast((v) => v + 1);
      if (["Space", "ShiftLeft", "ShiftRight"].includes(e.code))
        e.preventDefault();
    };
    const ku = (e) => (keys.current[e.code] = false);
    const clearOnBlur = () => (keys.current = {});

    const dom = gl.domElement;
    dom.tabIndex = 0; // ✅ 포커스 가능하게
    dom.style.outline = "none"; // 포커스시 테두리 제거
    dom.focus(); // ✅ 즉시 포커스 부여

    // ✅ 포인터락 이벤트 연결
    const handleClick = () => {
      if (document.pointerLockElement !== dom) dom.requestPointerLock();
    };
    dom.addEventListener("click", handleClick);

    // ✅ 전역 키 입력 등록
    window.addEventListener("keydown", kd, { passive: false });
    window.addEventListener("keyup", ku, { passive: false });
    window.addEventListener("blur", clearOnBlur);

    return () => {
      dom.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", clearOnBlur);
    };
  }, [gl, setBallast]);

  // ✅ 메인 물리 업데이트
  useFrame((_, dt) => {
    if (!ready.current || !rig.current) return;
    tRef.current += dt;

    // ✅ 항상 맨 위쪽에서 먼저
    const res = stepY({
      dt,
      y: headYRef.current,
      vy: vyRef.current,
      weightCount: ballast,
      bounds: { minY: bounds.minY, maxY: bounds.maxY },
      t: tRef.current,
    });

    vyRef.current = res.newVy;
    headYRef.current = res.newY;

    // 나머지 이동 계산
    const d = stepXZ({
      dt,
      camera,
      moveKeys: keys.current,
      effMass: Math.max(100, res.totalMass ?? 180),
    });

    let next = rig.current.position.clone();
    if (Number.isFinite(d.x)) next.x += d.x;
    if (Number.isFinite(d.y)) next.z += d.y;
    clampXZ(next, bounds, radius);

    let centerY = Math.min(
      Math.max(res.newY - headOffset, bounds.minY),
      bounds.maxY
    );
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
