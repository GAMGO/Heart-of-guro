// src/components/stages/Stage3.jsx
import React, { Suspense, useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { SimProvider } from "../../common/SimContext";
import StageShell from "../../common/StageShell";
import HUD from "../../common/HUD";
import Astronaut from "../../common/Astronaut";
import { HYDRO_CONFIG } from "../../physics/hydroConfig";

useGLTF.preload("/pool.glb");

// 🧭 좌표/경계 세팅
// 물 표면이 useVerticalHydroReal 기본값으로 y=6.0 이라면,
// 스폰을 수면 아래에서 시작시키는 게(예: 2.4) 가장 직관적입니다.
const SPAWN = new THREE.Vector3(-1.02, 2.4, 15.06);
const RING_POS = new THREE.Vector3(-5.489, 0, -7.946);

// 천장 클램프에 걸리지 않게 여유 확보
const BOUNDS = {
  minX: -20,
  maxX: 20,
  minY: 1.5,
  maxY: 20,
  minZ: -25,
  maxZ: 25,
};
const PLAYER_H = 1.75;
const PLAYER_R = 0.38;

// ⛏️ 풀 모델에서 '진짜 벽/바닥/천장'만 콜라이더로 수집
function Pool({ onColliders }) {
  const { scene } = useGLTF("/pool.glb");

  useEffect(() => {
    const boxes = [];
    scene.updateMatrixWorld(true);

    scene.traverse((o) => {
      if (!o.isMesh) return;
      const n = (o.name || "").toLowerCase();

      // 1) 콜라이더 후보
      const isCollider =
        n.includes("collision") ||
        n.includes("collider") ||
        n.startsWith("col_") ||
        o.userData?.collider === true;
      if (!isCollider) return;

      // 2) '물/볼륨/컨테이너' 류(공간 박스)는 제외 (이게 들어가면 Y가 항상 막힙니다)
      //   - 예시 키워드: water, volume, bounds, container, pool, liquid, area, region, trigger
      if (
        /(water|volume|bounds|container|pool|liquid|area|region|trigger)/i.test(
          n
        )
      )
        return;

      // 3) 시각적으로는 감추되, AABB만 추출
      o.visible = false;
      o.updateWorldMatrix(true, true);
      const b = new THREE.Box3().setFromObject(o);
      boxes.push(b);
    });

    onColliders(boxes);
  }, [scene, onColliders]);

  return <primitive object={scene} />;
}

export default function Stage3() {
  const [colliders, setColliders] = useState([]);

  // Stage3용 물리 파라미터 소폭 보정
  const CONFIG3 = {
    ...HYDRO_CONFIG,
    // 수면(y=6) 기준으로 살짝 양성 쪽(상승 방향) 트림
    neutralTrimN: HYDRO_CONFIG.neutralTrimN ?? 2.0,
    // 감쇠 완화 (상승이 바로 죽지 않게)
    linearDamp: Math.min(8, HYDRO_CONFIG.linearDamp ?? 8),
    // 필요 시 수면 재설정 (기본 6.0을 그대로 쓰면 주석)
    // waterSurfaceY: 6.0,
  };

  // ⛳️ 핵심: 카메라는 리터럴로 넘겨서 R3F가 정상 초기화/갱신 하도록
  const camera = { position: [SPAWN.x, SPAWN.y, SPAWN.z], fov: 60 };

  // ⛳️ 초기 ballast를 약간 가볍게 시작하면 더 명료 (원하시면 0으로)
  const initialBallast = (HYDRO_CONFIG.ballastKg ?? 0) - 3;

  return (
    <SimProvider initialBallast={initialBallast}>
      <StageShell
        camera={camera}
        envPreset="sunset"
        title={<HUD title="Stage 3" />}
      >
        <Suspense fallback={null}>
          <Pool onColliders={setColliders} />

          <Astronaut
            spawn={SPAWN}
            bounds={BOUNDS}
            headOffset={PLAYER_H * 0.5}
            height={PLAYER_H}
            radius={PLAYER_R}
            colliders={colliders}
            config={CONFIG3}
          />

          {/* 링 타겟 (참조용) */}
          <mesh position={RING_POS} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.8, 0.02, 16, 64]} />
            <meshStandardMaterial
              color="#ff4040"
              emissive="#ff4040"
              emissiveIntensity={1.3}
              roughness={0.35}
            />
          </mesh>
        </Suspense>
      </StageShell>
    </SimProvider>
  );
}
