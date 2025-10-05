// src/components/stages/Stage3.jsx
import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { SimProvider, useSim } from "../../common/SimContext";
import StageShell from "../../common/StageShell";
import HUD from "../../common/HUD";
import useHydroMovementReal from "../../physics/useHydroMovementReal";
import useVerticalHydroReal from "../../physics/useVerticalHydroReal";
import { HYDRO_CONFIG } from "../../physics/hydroConfig";

useGLTF.preload("/pool.glb");

const SPAWN_POS = new THREE.Vector3(-1.02, 1.75, 15.06);
const PLAYER_HEIGHT = 1.75;
const PLAYER_RADIUS = 0.38;
const HEAD_OFFSET = PLAYER_HEIGHT * 0.5;

const CAM_MIN_Y = 1.75;     // ✅ 카메라(머리) 최소 높이
const PAD = 0.01;           // 경계 떨림 방지

function isColliderNode(o) {
  const n = (o.name || "").toLowerCase();
  return n.includes("collision") || n.includes("collider") || n.startsWith("col_") || o.userData?.collider === true;
}

// 'spaceship' 충돌 대상 탐지(이름/머티리얼/유저데이터)
function isSpaceshipNode(o) {
  const name = (o.name || "").toLowerCase();
  const mat  = (o.material?.name || "").toLowerCase();
  const uvUD = (o.userData?.uv || "").toLowerCase();
  const tag  = (o.userData?.tag || "").toLowerCase();
  return (
    name.includes("spaceship") ||
    mat.includes("spaceship")  ||
    uvUD === "spaceship"       ||
    tag === "spaceship"
  );
}

function Pool({ onReady }) {
  const { scene } = useGLTF("/pool.glb");
  const readyOnce = useRef(false);

  useEffect(() => {
    if (readyOnce.current) return;

    // 충돌용 메쉬는 숨김
    scene.traverse((o) => {
      if (!o.isMesh) return;
      if (isColliderNode(o)) o.visible = false;
    });
    scene.updateMatrixWorld(true);

    // water 박스(XZ 경계)
    let waterNode = null;
    scene.traverse((o) => {
      if (!o.isMesh) return;
      if ((o.name || "").toLowerCase() === "water") waterNode = o;
    });

    let xzBounds, yBounds;
    if (waterNode) {
      const wb = new THREE.Box3().setFromObject(waterNode);
      xzBounds = {
        minX: wb.min.x + PAD, maxX: wb.max.x - PAD,
        minZ: wb.min.z + PAD, maxZ: wb.max.z - PAD,
      };
      // 머리 높이의 기본 범위(수면 밖으로 못 나가게)
      yBounds = { headMin: wb.min.y + PAD + HEAD_OFFSET, headMax: wb.max.y - PAD };
    } else {
      // 폴백: 씬 전체
      const world = new THREE.Box3().setFromObject(scene);
      xzBounds = {
        minX: world.min.x + PAD, maxX: world.max.x - PAD,
        minZ: world.min.z + PAD, maxZ: world.max.z - PAD,
      };
      yBounds = { headMin: world.min.y + PAD + HEAD_OFFSET, headMax: world.max.y - PAD };
      console.warn("[Stage] 'water' 메쉬를 못 찾아 씬 박스를 경계로 사용합니다.");
    }

    // ✅ spaceship 충돌 박스 수집
    const spaceshipBoxes = [];
    scene.traverse((o) => {
      if (!o.isMesh) return;
      if (!isSpaceshipNode(o)) return;
      o.updateWorldMatrix(true, true);
      spaceshipBoxes.push(new THREE.Box3().setFromObject(o));
    });

    onReady({ xzBounds, yBounds, spaceshipBoxes });
    readyOnce.current = true;
  }, [scene, onReady]);

  return <primitive object={scene} />;
}

// AABB 확장(캡슐 반지름/반높이 고려)
function expandBox(box, r, halfH) {
  return new THREE.Box3(
    new THREE.Vector3(box.min.x - r, box.min.y - halfH, box.min.z - r),
    new THREE.Vector3(box.max.x + r, box.max.y + halfH, box.max.z + r)
  );
}
function inside(p, b) {
  return (p.x > b.min.x && p.x < b.max.x && p.y > b.min.y && p.y < b.max.y && p.z > b.min.z && p.z < b.max.z);
}
function collides(centerPos, boxes, radius, halfH) {
  for (let i = 0; i < boxes.length; i++) {
    if (inside(centerPos, expandBox(boxes[i], radius, halfH))) return true;
  }
  return false;
}

// XZ는 water 박스 내부로 강제
function clampXZInside(center, xz, radius) {
  center.x = Math.min(Math.max(center.x, xz.minX + radius), xz.maxX - radius);
  center.z = Math.min(Math.max(center.z, xz.minZ + radius), xz.maxZ - radius);
  return center;
}

// 'spaceship' 박스에만 간단한 축분리 충돌 차단(콜리전 OFF 상태에서 예외적으로 막기)
function blockBySpaceship(cur, proposed, boxes, radius, halfH) {
  const out = cur.clone();

  // X만 시도
  const tryX = new THREE.Vector3(proposed.x, cur.y, cur.z);
  if (!collides(tryX, boxes, radius, halfH)) out.x = proposed.x; else out.x = cur.x;

  // Z만 시도 (X 반영 후)
  const tryZ = new THREE.Vector3(out.x, cur.y, proposed.z);
  if (!collides(tryZ, boxes, radius, halfH)) out.z = proposed.z; else out.z = cur.z;

  // Y만 시도 (XZ 반영 후)
  const tryY = new THREE.Vector3(out.x, proposed.y, out.z);
  if (!collides(tryY, boxes, radius, halfH)) out.y = proposed.y; else out.y = cur.y;

  return out;
}

function Player({ xzBounds, yBounds, spaceshipBoxes }) {
  const { camera, gl } = useThree();
  const { posRef, ballast, setBallast, setStageText } = useSim();
  const rig = useRef(null);
  const keys = useRef({});

  const headYRef = useRef(SPAWN_POS.y); // "머리 높이" 상태
  const vyRef = useRef(0);
  const tRef = useRef(0);

  const hydroMove = useHydroMovementReal(HYDRO_CONFIG);
  const verticalMove = useVerticalHydroReal(HYDRO_CONFIG);
  const ready = useRef(false);
  const halfH = PLAYER_HEIGHT * 0.5;

  useEffect(() => {
    if (!rig.current) return;

    // 초기 위치(캡슐 중심)
    const startCenter = new THREE.Vector3(SPAWN_POS.x, SPAWN_POS.y - HEAD_OFFSET, SPAWN_POS.z);
    clampXZInside(startCenter, xzBounds, PLAYER_RADIUS);

    // 시작 머리 높이를 동기화 + 카메라 최소 높이 보장
    headYRef.current = Math.max(startCenter.y + HEAD_OFFSET, CAM_MIN_Y);

    rig.current.position.copy(startCenter);
    camera.position.set(0, HEAD_OFFSET, 0);
    rig.current.add(camera);

    if (setStageText) setStageText("이동: WASD, 부력: E/R (water 밖 XZ 차단, spaceship 충돌 차단, 카메라 1.75m 이상)");
    ready.current = true;
  }, [xzBounds, setStageText, camera]);

  useEffect(() => {
    const dom = gl.domElement;
    dom.tabIndex = 0;
    dom.style.outline = "none";
    const focus = () => dom.focus();
    dom.addEventListener("pointerdown", focus);

    const kd = (e) => {
      keys.current[e.code] = true;
      if (e.code === "KeyE") setBallast((v) => Math.max(0, v - 1));
      if (e.code === "KeyR") setBallast((v) => v + 1);
      if (/Arrow|Space/.test(e.code)) e.preventDefault();
    };
    const ku = (e) => { keys.current[e.code] = false; };

    document.addEventListener("keydown", kd, true);
    document.addEventListener("keyup", ku, true);
    const clear = () => (keys.current = {});
    window.addEventListener("blur", clear);

    return () => {
      dom.removeEventListener("pointerdown", focus);
      document.removeEventListener("keydown", kd, true);
      document.removeEventListener("keyup", ku, true);
      window.removeEventListener("blur", clear);
    };
  }, [gl, setBallast]);

  useFrame((_, dt) => {
    if (!ready.current || !rig.current) return;
    tRef.current += dt;

    // --- 수직(부력/중량): 머리 높이 범위(headMin~headMax), 그리고 카메라 최소 높이 1.75 보장 ---
    const baseHeadMin = yBounds.headMin ?? -Infinity;
    const baseHeadMax = yBounds.headMax ?? Infinity;
    const headMin = Math.max(baseHeadMin, CAM_MIN_Y);  // ✅ 카메라 최소 높이 강제
    const headMax = baseHeadMax;

    const vyRes = verticalMove.stepY({
      dt,
      y: headYRef.current,
      vy: vyRef.current,
      weightCount: ballast,
      bounds: { minY: headMin, maxY: headMax },
      speedXZ: 0,
      t: tRef.current,
    });
    vyRef.current = vyRes.newVy;

    let headTarget = THREE.MathUtils.clamp(vyRes.newY, headMin, headMax);

    // --- 수평 이동 ---
    const d = hydroMove.step({
      dt,
      camera,
      moveKeys: keys.current,
      effMass: Math.max(100, vyRes.totalMass ?? 180),
    });

    const cur = rig.current.position.clone();
    const proposed = cur.clone();

    if (Number.isFinite(d.x)) proposed.x = cur.x + d.x;
    if (Number.isFinite(d.y)) proposed.z = cur.z + d.y;
    proposed.y = headTarget - HEAD_OFFSET;

    // 1) XZ는 water 내부로 고정
    clampXZInside(proposed, xzBounds, PLAYER_RADIUS);

    // 2) spaceship 충돌 차단(예외적으로만 사용)
    const blocked = blockBySpaceship(cur, proposed, spaceshipBoxes, PLAYER_RADIUS, halfH);

    rig.current.position.copy(blocked);
    headYRef.current = blocked.y + HEAD_OFFSET; // 상태 동기화(머리 높이)
    posRef.current = { x: blocked.x, y: blocked.y + HEAD_OFFSET, z: blocked.z };
  });

  return (
    <group ref={rig}>
      {/* 카메라 장착 리그(보이지 않음) */}
      <mesh visible={false} position={[0, 0, 0]}>
        <capsuleGeometry args={[PLAYER_RADIUS, PLAYER_HEIGHT - 2 * PLAYER_RADIUS, 8, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

function StageInner() {
  const [world, setWorld] = useState(null);
  const onReady = useCallback((data) => setWorld(data), []);
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <Pool onReady={onReady} />
      {world && (
        <Player
          xzBounds={world.xzBounds}
          yBounds={world.yBounds}
          spaceshipBoxes={world.spaceshipBoxes}
        />
      )}
    </>
  );
}

export default function Stage3() {
  return (
    <SimProvider initialBallast={HYDRO_CONFIG.ballastKg}>
      <StageShell
        camera={{ position: [SPAWN_POS.x, SPAWN_POS.y, SPAWN_POS.z], fov: 75 }}
        envPreset="warehouse"
        title={<HUD title="Training Stage" extra={null} />}
      >
        <Suspense fallback={null}>
          <StageInner />
          <Environment preset="warehouse" />
        </Suspense>
      </StageShell>
    </SimProvider>
  );
}
