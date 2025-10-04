// src/components/stages/Stage1.jsx
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
const FLOOR_MIN_Y = 1.5;
const CEIL_MAX_Y = 12;

function isColliderNode(o) {
  const n = (o.name || "").toLowerCase();
  return n.includes("collision") || n.includes("collider") || n.startsWith("col_") || o.userData?.collider === true;
}

function Pool({ onReady }) {
  const { scene } = useGLTF("/pool.glb");
  useEffect(() => {
    scene.traverse((o) => {
      if (!o.isMesh) return;
      if (isColliderNode(o)) o.visible = false;
    });
    scene.updateMatrixWorld(true);
    const world = new THREE.Box3().setFromObject(scene);
    const bounds = { minX: world.min.x - 1, maxX: world.max.x + 1, minY: FLOOR_MIN_Y, maxY: CEIL_MAX_Y, minZ: world.min.z - 1, maxZ: world.max.z + 1 };
    const boxes = [];
    scene.traverse((o) => {
      if (!o.isMesh) return;
      if (!isColliderNode(o)) return;
      o.updateWorldMatrix(true, true);
      const b = new THREE.Box3().setFromObject(o);
      boxes.push(b);
    });
    onReady({ bounds, boxes });
  }, [scene, onReady]);
  return <primitive object={scene} />;
}

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

function clampWorldCenter(p, world, r) {
  p.x = Math.min(Math.max(p.x, world.minX + r), world.maxX - r);
  p.z = Math.min(Math.max(p.z, world.minZ + r), world.maxZ - r);
  return p;
}

function Player({ worldBounds, colBoxes }) {
  const { camera, gl } = useThree();
  const { posRef, ballast, setBallast, setStageText } = useSim();
  const rig = useRef(null);
  const keys = useRef({});
  const headYRef = useRef(SPAWN_POS.y);
  const vyRef = useRef(0);
  const tRef = useRef(0);
  const { stepY } = useVerticalHydroReal(HYDRO_CONFIG);
  const { step: stepXZ } = useHydroMovementReal(HYDRO_CONFIG);
  const ready = useRef(false);
  const halfH = PLAYER_HEIGHT * 0.5;

  useEffect(() => {
    if (rig.current) rig.current.position.set(SPAWN_POS.x, SPAWN_POS.y - HEAD_OFFSET, SPAWN_POS.z);
    camera.position.set(0, HEAD_OFFSET, 0);
    if (rig.current) rig.current.add(camera);
    setStageText("이동: WASD, 부력: E/R");
    ready.current = true;
  }, [camera, setStageText]);

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

    const vyRes = stepY({ dt, y: headYRef.current, vy: vyRef.current, weightCount: ballast, bounds: { minY: worldBounds.minY, maxY: worldBounds.maxY }, speedXZ: 0, t: tRef.current });
    vyRef.current = vyRes.newVy;
    headYRef.current = vyRes.newY;

    const d = stepXZ({ dt, camera, moveKeys: keys.current, effMass: Math.max(100, vyRes.totalMass ?? 180) });

    const cur = rig.current.position.clone();
    const next = cur.clone();

    if (Number.isFinite(d.x)) {
      const tryX = cur.clone();
      tryX.x += d.x;
      clampWorldCenter(tryX, worldBounds, PLAYER_RADIUS);
      if (!collides(tryX, colBoxes, PLAYER_RADIUS, halfH)) next.x = tryX.x;
    }
    if (Number.isFinite(d.y)) {
      const tryZ = next.clone();
      tryZ.z += d.y;
      clampWorldCenter(tryZ, worldBounds, PLAYER_RADIUS);
      if (!collides(tryZ, colBoxes, PLAYER_RADIUS, halfH)) next.z = tryZ.z;
    }

    const headTarget = Math.min(Math.max(headYRef.current, worldBounds.minY), worldBounds.maxY);
    const centerY = headTarget - HEAD_OFFSET;
    const tryY = next.clone();
    tryY.y = centerY;
    if (!collides(tryY, colBoxes, PLAYER_RADIUS, halfH)) next.y = centerY;

    rig.current.position.copy(next);
    posRef.current = { x: next.x, y: next.y + HEAD_OFFSET, z: next.z };
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

function Stage1Inner() {
  const [world, setWorld] = useState(null);
  const onReady = (data) => setWorld(data);
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <Pool onReady={onReady} />
      {world && <Player worldBounds={world.bounds} colBoxes={world.boxes} />}
    </>
  );
}

export default function Stage1() {
  return (
    <SimProvider initialBallast={HYDRO_CONFIG.ballastKg}>
      <StageShell camera={{ position: [SPAWN_POS.x, SPAWN_POS.y, SPAWN_POS.z], fov: 75 }} envPreset="warehouse" title={<HUD title="Stage 1" extra={null} />}>
        <Suspense fallback={null}>
          <Stage1Inner />
          <Environment preset="warehouse" />
        </Suspense>
      </StageShell>
    </SimProvider>
  );
}
//