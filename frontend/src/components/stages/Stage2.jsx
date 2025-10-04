import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  PointerLockControls,
  Environment,
  useGLTF,
  useAnimations,
} from "@react-three/drei";
import * as THREE from "three";
import useVerticalHydroReal from "../../physics/useVerticalHydroReal";
import { buildEmuNblConfig } from "../../physics/nasaPresets";
import "./Stage2.css";

useGLTF.preload("/pool.glb");

function useRepairKeyOnly() {
  const [isRPressed, setIsRPressed] = useState(false);

  useEffect(() => {
    const down = (e) => {
      if (e.code === "KeyR") {
        setIsRPressed(true);
        e.preventDefault();
      }
    };
    const up = (e) => {
      if (e.code === "KeyR") {
        setIsRPressed(false);
      }
    };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up, { passive: true });
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return isRPressed;
}

function Stage2Inner({ onPositionUpdate, onRepairStart, onRepairComplete }) {
  const { camera } = useThree();
  const { scene: pool, animations } = useGLTF("/pool.glb");
  const { actions, mixer } = useAnimations(animations, pool);

  const [ready, setReady] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  const worldBox = useRef(new THREE.Box3());
  const player = useRef(new THREE.Vector3());
  const ceilY = useRef(12);
  const pad = 0.25;
  const minY = 1.75;

  const isRPressed = useRepairKeyOnly();

  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  const RING_POS = useMemo(() => new THREE.Vector3(-1.59, 0.0, 14.89), []);
  const RING_COLOR = "#ff3030";
  const REPAIR_DISTANCE = 2.0;

  const hydro = useVerticalHydroReal(buildEmuNblConfig({ ballastKg: 5 }));

  const pgtRef = useRef(null);
  const boltRefs = useRef([]);

  useEffect(() => {
    pool.updateMatrixWorld(true);

    pool.traverse((o) => {
      if (!o.isMesh && !o.isGroup) return;
      const name = (o.name || "").toLowerCase();
      const c = o.material?.color;
      const isMagenta =
        c && Math.abs(c.r - 1) + Math.abs(c.g - 0) + Math.abs(c.b - 1) < 0.4;

      if (
        name.includes("collider") ||
        name.includes("collision") ||
        isMagenta
      ) {
        o.visible = false;
      }

      if (o.name === "PGT") {
        pgtRef.current = o;
        o.visible = false;
        o.children.forEach((child) => {
          child.visible = false;
        });
      }

      if (
        o.name === "nasa" ||
        o.name === "nasa001" ||
        o.name === "nasa002" ||
        o.name === "nasa003"
      ) {
        boltRefs.current.push(o);
        o.visible = false;
      }
    });

    worldBox.current.setFromObject(pool);
    const center = new THREE.Vector3();
    worldBox.current.getCenter(center);
    ceilY.current = worldBox.current.max.y - pad;

    player.current.set(center.x, minY, center.z);
    camera.position.copy(player.current);

    setReady(true);
  }, [pool, camera]);

  useEffect(() => {
    if (pgtRef.current) {
      pgtRef.current.visible = isRepairing;
      pgtRef.current.children.forEach((child) => {
        child.visible = isRepairing;
      });
    }

    boltRefs.current.forEach((bolt) => {
      if (bolt) {
        bolt.visible = isRepairing;
      }
    });
  }, [isRepairing]);

  useEffect(() => {
    const kd = (e) => hydro.onKeyDown(e);
    const ku = (e) => hydro.onKeyUp(e);
    window.addEventListener("keydown", kd, { passive: false });
    window.addEventListener("keyup", ku, { passive: false });
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [hydro]);

  useEffect(() => {
    if (!isRPressed) return;
    const distance = player.current.distanceTo(RING_POS);
    if (distance <= REPAIR_DISTANCE) {
      setIsRepairing(true);
      onRepairStart();

      if (actions.fix) {
        actions.fix.setLoop(THREE.LoopOnce, 1);
        actions.fix.clampWhenFinished = true;
        actions.fix.reset().play();

        const onFinished = (event) => {
          if (event.action === actions.fix) {
            mixer.removeEventListener("finished", onFinished);
            setIsRepairing(false);
            onRepairComplete();
          }
        };
        mixer.addEventListener("finished", onFinished);
      }
    }
  }, [isRPressed, actions, mixer, onRepairStart, onRepairComplete, RING_POS]);

  useFrame((_, dt) => {
    if (!ready) return;

    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() === 0) forward.set(0, 0, -1);
    forward.normalize();
    right.copy(up).cross(forward).normalize();

    const r = hydro.step(dt, forward, right);

    let y = r.y;
    if (y < minY) {
      y = minY;
    }
    if (y > ceilY.current) {
      y = ceilY.current;
    }

    const min = worldBox.current.min.clone().addScalar(pad);
    const max = worldBox.current.max.clone().addScalar(-pad);
    const clampedX = THREE.MathUtils.clamp(r.x, min.x, max.x);
    const clampedZ = THREE.MathUtils.clamp(r.z, min.z, max.z);

    player.current.set(clampedX, y, clampedZ);
    camera.position.copy(player.current);
    onPositionUpdate(player.current);
  });

  return (
    <>
      <primitive object={pool} />
      <mesh position={RING_POS} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.02, 16, 64]} />
        <meshBasicMaterial color={RING_COLOR} transparent opacity={0.9} />
      </mesh>
    </>
  );
}

export default function Stage2() {
  const [locked, setLocked] = useState(false);
  const ctrl = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [stage, setStage] = useState(1);

  const handlePositionUpdate = (newPosition) => {
    setPosition({
      x: newPosition.x.toFixed(2),
      y: newPosition.y.toFixed(2),
      z: newPosition.z.toFixed(2),
    });
  };

  const handleRepairStart = () => {
    setStage(3);
  };
  const handleRepairComplete = () => {
    setStage(4);
  };

  const getStageText = () => {
    switch (stage) {
      case 1:
        return "빨간 원을 찾으세요.";
      case 2:
        return "수리해주세요";
      case 3:
        return "수리 중...";
      case 4:
        return "수리 완료!";
      default:
        return "빨간 원을 찾으세요.";
    }
  };

  const getStageTitle = () => {
    switch (stage) {
      case 1:
        return "현재 단계: 탐색";
      case 2:
        return "현재 단계: 접근";
      case 3:
        return "현재 단계: 수리";
      case 4:
        return "현재 단계: 완료";
      default:
        return "현재 단계: 탐색";
    }
  };

  return (
    <div className="stage2-canvas">
      {!locked && (
        <div className="lock-hint" onClick={() => ctrl.current?.lock()}>
          클릭해서 조작 시작 (WASD, Space, Shift, 마우스로 시점)
        </div>
      )}

      <div className="quest-panel">
        <h3>Stage 2 — 외벽 수리 훈련</h3>
        <div className="sub">{getStageTitle()}</div>

        <div className="quest-card purpose-card">
          <div className="quest-card-title">훈련 목적</div>
          <div className="purpose-info">
            <div>우주에서의 중성부력 환경을 체험하고</div>
            <div>우주선 외벽 수리 기술을 습득합니다.</div>
          </div>
        </div>

        <div className="quest-card hint-card">
          <div>수리 위치로 접근하세요</div>
          <div className="hint-sub">{getStageText()}</div>
        </div>

        <div className="quest-card status-card">
          <div className="quest-card-title">캐릭터 좌표</div>
          <div className="status-info">
            <div>X: {position.x}</div>
            <div>Y: {position.y}</div>
            <div>Z: {position.z}</div>
          </div>
        </div>

        <div className="quest-card controls-card">
          <div className="quest-card-title">조작법</div>
          <div className="controls-info">
            <div>WASD: 이동</div>
            <div>마우스: 시점 조작</div>
            <div>Space: 위로 이동</div>
            <div>Shift: 아래로 이동</div>
            <div>R키: 수리 시작</div>
          </div>
        </div>
      </div>

      <Canvas camera={{ position: [8, 2, 8], fov: 60 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[8, 12, 6]} intensity={1.1} />
        <Suspense fallback={null}>
          <Stage2Inner
            onPositionUpdate={handlePositionUpdate}
            onRepairStart={handleRepairStart}
            onRepairComplete={handleRepairComplete}
          />
          <Environment preset="warehouse" />
        </Suspense>
        <PointerLockControls
          ref={ctrl}
          onLock={() => setLocked(true)}
          onUnlock={() => setLocked(false)}
        />
      </Canvas>
    </div>
  );
}
