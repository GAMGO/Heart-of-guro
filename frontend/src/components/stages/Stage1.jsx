import { useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useGLTF, PointerLockControls } from "@react-three/drei"
import useVerticalHydroReal from "../../physics/useVerticalHydroReal"
import { buildEmuNblConfig } from "../../physics/nasaPresets"
import * as THREE from "three"

// 풀(glb) 장면
function Pool() {
  const { scene } = useGLTF("./pool.glb")
  return <primitive object={scene} scale={1} />
}

// 카메라와 시뮬레이터 직접 연동
function SimController({ sim }) {
  const ref = useRef()
  const { camera } = useThree()

  useFrame((_, dt) => {
    // 카메라 forward/right 계산
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()

    const right = new THREE.Vector3()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    // 시뮬레이터 업데이트
    const { x, y, z } = sim.step(dt, forward, right)

    // 카메라 위치 갱신
    camera.position.set(x, y + 0.2, z)

    // 플레이어 위치를 나타내는 오브젝트(작은 구)
    if (ref.current) {
      ref.current.position.set(x, y, z)
    }
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.3, 24, 24]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  )
}

export default function Stage1() {
  // NASA 프리셋 기반 시뮬레이터 생성
  const sim = useVerticalHydroReal(buildEmuNblConfig({}))

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [0, 2, 6], fov: 75 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />

        {/* 풀 */}
        <Pool />

        {/* 시뮬레이터 직접 연결 */}
        <SimController sim={sim} />

        {/* FPS 스타일 마우스 제어 */}
        <PointerLockControls />
      </Canvas>

      {/* 크로스헤어 */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "20px",
          height: "20px",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            width: "100%",
            height: "2px",
            background: "white",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            width: "2px",
            height: "100%",
            background: "white",
          }}
        />
      </div>
    </div>
  )
}