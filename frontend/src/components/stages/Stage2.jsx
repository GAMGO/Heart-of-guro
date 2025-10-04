import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  PointerLockControls,
  Environment,
  useGLTF,
  useAnimations,
} from "@react-three/drei";
import * as THREE from "three";
import "./Stage2.css";

useGLTF.preload("/pool.glb");

function useKeys() {
  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    r: false,
  });
  const prevKeys = useRef({ r: false });
  const [isRPressed, setIsRPressed] = useState(false);

  useEffect(() => {
    const down = (e) => {
      switch (e.code) {
        case "KeyW":
          keys.current.w = true;
          e.preventDefault();
          break;
        case "KeyA":
          keys.current.a = true;
          e.preventDefault();
          break;
        case "KeyS":
          keys.current.s = true;
          e.preventDefault();
          break;
        case "KeyD":
          keys.current.d = true;
          e.preventDefault();
          break;
        case "KeyR":
          keys.current.r = true;
          if (!prevKeys.current.r) {
            setIsRPressed(true);
          }
          e.preventDefault();
          break;
        default:
          break;
      }
    };
    const up = (e) => {
      switch (e.code) {
        case "KeyW":
          keys.current.w = false;
          break;
        case "KeyA":
          keys.current.a = false;
          break;
        case "KeyS":
          keys.current.s = false;
          break;
        case "KeyD":
          keys.current.d = false;
          break;
        case "KeyR":
          keys.current.r = false;
          prevKeys.current.r = false;
          setIsRPressed(false);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up, { passive: true });
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    if (isRPressed) {
      const timer = setTimeout(() => {
        setIsRPressed(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isRPressed]);

  return { keys, isRPressed };
}

function Stage2Inner({ onPositionUpdate, onRepairStart, onRepairComplete }) {
  const { camera } = useThree();
  const { scene: pool, animations } = useGLTF("/pool.glb");
  const { actions, mixer } = useAnimations(animations, pool);
  const [ready, setReady] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const worldBox = useRef(new THREE.Box3());
  const player = useRef(new THREE.Vector3());
  const { keys, isRPressed } = useKeys();
  const tmpDir = useMemo(() => new THREE.Vector3(), []);
  const tmpNext = useMemo(() => new THREE.Vector3(), []);
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const pad = 0.25;
  const minY = 1.75;
  const ceilY = useRef(12);

  const pgtRef = useRef(null);
  const boltRefs = useRef([]);

  const RING_POS = useMemo(() => new THREE.Vector3(-1.59, 0.0, 14.89), []);
  const RING_COLOR = "#ff3030";
  const REPAIR_DISTANCE = 2.0;

  useEffect(() => {
    if (isRPressed) {
      const distance = player.current.distanceTo(RING_POS);
      console.log("현재 거리:", distance.toFixed(2), "수리 가능 거리:", REPAIR_DISTANCE);
      
      if (distance <= REPAIR_DISTANCE) {
        console.log("수리 가능한 거리입니다! 수리 시작!");
        setIsRepairing(true);
        onRepairStart();
        
        if (actions.fix) {
          actions.fix.setLoop(THREE.LoopOnce, 1);
          actions.fix.clampWhenFinished = true;
          actions.fix.reset().play();
          
          const handleAnimationComplete = () => {
            setIsRepairing(false);
            onRepairComplete();
          };

          if (mixer) {
            const onFinished = (event) => {
              if (event.action === actions.fix) {
                mixer.removeEventListener("finished", onFinished);
                handleAnimationComplete();
              }
            };
            mixer.addEventListener("finished", onFinished);
          }
        }
      } else {
        console.log("수리 위치에서 너무 멉니다. 더 가까이 접근하세요!");
      }
    }
  }, [isRPressed, actions, onRepairStart, onRepairComplete, mixer, RING_POS]);

  useEffect(() => {
    pool.updateMatrixWorld(true);
    
    pool.traverse((o) => {
      if (!o.isMesh && !o.isGroup) return;
      const name = (o.name || "").toLowerCase();
      const c = o.material?.color;
      const isMagenta = c && Math.abs(c.r - 1) + Math.abs(c.g - 0) + Math.abs(c.b - 1) < 0.4;
      
      if (name.includes("collider") || name.includes("collision") || isMagenta) {
        o.visible = false;
      }
      
      if (o.name === "PGT") {
        pgtRef.current = o;
        o.visible = false;
        o.children.forEach(child => {
          child.visible = false;
        });
      }
      
      if (o.name === "nasa" || o.name === "nasa001" || o.name === "nasa002" || o.name === "nasa003") {
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
      pgtRef.current.children.forEach(child => {
        child.visible = isRepairing;
      });
    }
    
    boltRefs.current.forEach(bolt => {
      if (bolt) {
        bolt.visible = isRepairing;
      }
    });
  }, [isRepairing]);

  useFrame((_, dt) => {
    if (!ready) return;
    const base = 2.0;
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
    const moveX = right.x * tmpDir.x * speed + forward.x * tmpDir.z * speed;
    const moveZ = right.z * tmpDir.x * speed + forward.z * tmpDir.z * speed;
    tmpNext.set(
      player.current.x + moveX,
      player.current.y,
      player.current.z + moveZ
    );
    let y = player.current.y;
    if (y < minY) {
      y = minY;
    }
    if (y > ceilY.current) {
      y = ceilY.current;
    }
    const min = worldBox.current.min.clone().addScalar(pad);
    const max = worldBox.current.max.clone().addScalar(-pad);
    tmpNext.x = THREE.MathUtils.clamp(tmpNext.x, min.x, max.x);
    tmpNext.z = THREE.MathUtils.clamp(tmpNext.z, min.z, max.z);
    player.current.set(tmpNext.x, y, tmpNext.z);
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
    console.log("수리 시작됨!");
    setStage(3);
  };

  const handleRepairComplete = () => {
    console.log("수리 완료됨!");
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
          클릭해서 조작 시작 (WASD, 마우스로 시점)
        </div>
      )}

      <div className="quest-panel">
        <h3>Stage 2 — 외벽 수리 훈련</h3>
        <div className="sub">{getStageTitle()}</div>

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