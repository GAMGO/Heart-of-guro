import React, { Suspense, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import useHydroMovementReal from "../../physics/useHydroMovementReal";
import useVerticalHydroReal from "../../physics/useVerticalHydroReal";
import { HYDRO_CONFIG } from "../../physics/hydroConfig";
import { SimProvider, useSim } from "../../common/SimContext";
import StageShell from "../../common/StageShell";
import HUD from "../../common/HUD";

useGLTF.preload("/pool.glb");

const SPAWN_POS = new THREE.Vector3(-1.02, 1.75, 15.06);
const RING_POS = new THREE.Vector3(-5.489, 0, -7.946);
const PLAYER_HEIGHT = 1.75;
const PLAYER_RADIUS = 0.4;
const HEAD_OFFSET = PLAYER_HEIGHT * 0.5;
const FLOOR_MIN_Y = 1.5;
const CEIL_MAX_Y = 12;
const WORLD_LIMIT = { minX: -20, maxX: 20, minY: FLOOR_MIN_Y, maxY: CEIL_MAX_Y, minZ: -25, maxZ: 25 };

function Pool() {
  const { scene } = useGLTF("/pool.glb");
  scene.traverse((o) => {
    if (o.name.toLowerCase().includes("collision")) o.visible = false;
  });
  return <primitive object={scene} />;
}

function gatherSpaceshipBoxes(root) {
  const boxes = [];
  let shipRoot = null;
  root.traverse((o) => {
    const n = (o.name || "").toLowerCase();
    if (n.includes("spaceship")) shipRoot = o;
  });
  if (!shipRoot) return boxes;
  shipRoot.traverse((o) => {
    if (!o.isMesh) return;
    o.visible = false;
    o.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(o);
    boxes.push(b);
  });
  return boxes;
}

function expandBox(box, r, hh) {
  return new THREE.Box3(
    new THREE.Vector3(box.min.x - r, box.min.y - hh, box.min.z - r),
    new THREE.Vector3(box.max.x + r, box.max.y + hh, box.max.z + r)
  );
}

function pointInsideBox(p, b) {
  return p.x > b.min.x && p.x < b.max.x && p.y > b.min.y && p.y < b.max.y && p.z > b.min.z && p.z < b.max.z;
}

function collides(centerPos, boxes, radius, halfH) {
  for (let i = 0; i < boxes.length; i++) {
    const e = expandBox(boxes[i], radius, halfH);
    if (pointInsideBox(centerPos, e)) return true;
  }
  return false;
}

function clampWorldCenter(p, world, r) {
  p.x = Math.min(Math.max(p.x, world.minX + r), world.maxX - r);
  p.z = Math.min(Math.max(p.z, world.minZ + r), world.maxZ - r);
  return p;
}

function Player() {
  const { camera, gl, scene } = useThree();
  const { posRef, ballast, setBallast, setStageText } = useSim();
  const rig = useRef(null);
  const moveKeys = useRef({});
  const shipBoxesRef = useRef([]);
  const headYRef = useRef(SPAWN_POS.y);
  const vyRef = useRef(0);
  const tRef = useRef(0);
  const { stepY } = useVerticalHydroReal(HYDRO_CONFIG);
  const { step: stepXZ } = useHydroMovementReal(HYDRO_CONFIG);
  const ready = useRef(false);

  useEffect(() => {
    shipBoxesRef.current = gatherSpaceshipBoxes(scene);
    if (rig.current) rig.current.position.set(SPAWN_POS.x, SPAWN_POS.y - HEAD_OFFSET, SPAWN_POS.z);
    camera.position.set(0, HEAD_OFFSET, 0);
    if (rig.current) rig.current.add(camera);
    setStageText("빨간 링 근처로 이동하세요");
    ready.current = true;
  }, [scene, camera, setStageText]);

  useEffect(() => {
    const kd = (e) => {
      moveKeys.current[e.code] = true;
      if (e.code === "KeyE") setBallast((v) => Math.max(0, v - 1));
      if (e.code === "KeyR") setBallast((v) => v + 1);
      if (["Space", "ShiftLeft", "ShiftRight"].includes(e.code)) e.preventDefault();
    };
    const ku = (e) => (moveKeys.current[e.code] = false);
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
    const res = stepY({
      dt,
      y: headYRef.current,
      vy: vyRef.current,
      weightCount: ballast,
      bounds: { minY: FLOOR_MIN_Y, maxY: CEIL_MAX_Y },
      speedXZ: 0,
      t: tRef.current
    });
    vyRef.current = res.newVy;
    headYRef.current = res.newY;

    const d = stepXZ({
      dt,
      camera,
      moveKeys: moveKeys.current,
      effMass: Math.max(100, res.totalMass ?? 180)
    });

    const curCenter = rig.current.position.clone();
    const nextCenter = curCenter.clone();

    if (Number.isFinite(d.x)) {
      const tryPos = curCenter.clone();
      tryPos.x += d.x;
      clampWorldCenter(tryPos, WORLD_LIMIT, PLAYER_RADIUS);
      if (!collides(tryPos, shipBoxesRef.current, PLAYER_RADIUS, PLAYER_HEIGHT * 0.5)) nextCenter.x = tryPos.x;
    }

    if (Number.isFinite(d.y)) {
      const tryPos = nextCenter.clone();
      tryPos.z += d.y;
      clampWorldCenter(tryPos, WORLD_LIMIT, PLAYER_RADIUS);
      if (!collides(tryPos, shipBoxesRef.current, PLAYER_RADIUS, PLAYER_HEIGHT * 0.5)) nextCenter.z = tryPos.z;
    }

    const targetHead = Math.min(Math.max(headYRef.current, FLOOR_MIN_Y), CEIL_MAX_Y);
    const targetCenterY = targetHead - HEAD_OFFSET;
    const tryY = nextCenter.clone();
    tryY.y = targetCenterY;
    if (!collides(tryY, shipBoxesRef.current, PLAYER_RADIUS, PLAYER_HEIGHT * 0.5)) {
      nextCenter.y = targetCenterY;
    }

    rig.current.position.copy(nextCenter);
    posRef.current = { x: nextCenter.x, y: nextCenter.y + HEAD_OFFSET, z: nextCenter.z };

    const dist = new THREE.Vector3(nextCenter.x, nextCenter.y + HEAD_OFFSET, nextCenter.z).distanceTo(RING_POS);
    if (dist < 2) setStageText("✅ 미션 완료");
  });

  return (
    <group ref={rig}>
      <mesh visible={false} position={[0, 0, 0]}>
        <capsuleGeometry args={[PLAYER_RADIUS, PLAYER_HEIGHT - 2 * PLAYER_RADIUS, 8, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

function Stage3Inner() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 6, 4]} intensity={1.1} />
      <Pool />
      <Player />
      <mesh position={RING_POS} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.02, 16, 64]} />
        <meshStandardMaterial color="#ff4040" emissive="#ff4040" emissiveIntensity={1.3} roughness={0.35} />
      </mesh>
    </>
  );
}

export default function Stage3() {
  return (
    <SimProvider initialBallast={HYDRO_CONFIG.ballastKg}>
      <StageShell camera={{ position: [SPAWN_POS.x, SPAWN_POS.y, SPAWN_POS.z], fov: 60 }} envPreset="sunset" title={<HUD title="Stage 3" extra={null} />}>
        <Suspense fallback={null}>
          <Stage3Inner />
          <Environment preset="sunset" />
        </Suspense>
      </StageShell>
    </SimProvider>
  );
}
