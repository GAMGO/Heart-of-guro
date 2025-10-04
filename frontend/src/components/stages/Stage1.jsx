import { useEffect, useState, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useGLTF, PointerLockControls } from "@react-three/drei"
import useVerticalHydroReal from "../../physics/useVerticalHydroReal"
import { buildEmuNblConfig } from "../../physics/nasaPresets"
import * as THREE from "three"

// 풀 씬
function Pool() {
  const { scene } = useGLTF("./pool.glb")
  return <primitive object={scene} scale={1} />
}

// 시뮬레이션 컨트롤러
function SimController({ sim, targetDepth, onReached }) {
  const ref = useRef()
  const { camera } = useThree()

  useFrame((_, dt) => {
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()

    const right = new THREE.Vector3()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    // 기본 물리 스텝 실행
    const { x, y, z } = sim.step(dt, forward, right)

    camera.position.set(x, y + 0.2, z)
    if (ref.current) ref.current.position.set(x, y, z)

    // 목표 깊이에 도달했는지 체크
    if (Math.abs(y - targetDepth) < 0.1) {
      onReached()
    }
  })

  return (
    <>
      {/* 플레이어 표시 */}
      <mesh ref={ref}>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshStandardMaterial color="orange" />
      </mesh>

      {/* 목표 마커 */}
      <mesh position={[0, targetDepth, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="yellow" />
      </mesh>
    </>
  )
}

export default function Stage1() {
  // ✅ 시작할 때 ballastKg을 줘서 무조건 가라앉게 설정
  const sim = useVerticalHydroReal(buildEmuNblConfig({ ballastKg: 5 }))

  const [targetDepth, setTargetDepth] = useState(
    0.5 + Math.random() * 3.0 // 0.5~3.5m 범위 랜덤 목표
  )
  const [message, setMessage] = useState("Adjust buoyancy to reach the target")
  const [floatCount, setFloatCount] = useState(0) // 부표 개수
  const [weightCount, setWeightCount] = useState(5) // 시작 ballastKg=5 → 초기 추 개수 5개

  // Space=부표 추가, Shift=추 추가
  useEffect(() => {
    const onDown = (e) => {
      if (e.code === "Space") {
        e.preventDefault()
        sim.rigidVolume += 0.01 // 부표 하나 추가
        setFloatCount((c) => c + 1)
      }
      if (e.code === "ShiftLeft") {
        sim.addBallast(1) // 추 하나 추가
        setWeightCount((c) => c + 1)
      }
    }
    document.addEventListener("keydown", onDown)
    return () => document.removeEventListener("keydown", onDown)
  }, [sim])

  const handleReached = () => {
    setMessage("🎉 Neutral Buoyancy Reached!")
    setTimeout(() => {
      setTargetDepth(0.5 + Math.random() * 3.0)
      setMessage("New Target Assigned!")
    }, 2000)
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [0, 2, 6], fov: 75 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />

        <Pool />
        <SimController sim={sim} targetDepth={targetDepth} onReached={handleReached} />
        <PointerLockControls />
      </Canvas>

      {/* HUD */}
      <div style={{
        position: "absolute", top: 20, left: 20,
        background: "rgba(0,0,0,0.6)", color: "white",
        padding: "12px 16px", borderRadius: 8, fontFamily: "monospace"
      }}>
        <h3>Neutral Buoyancy Training</h3>
        <p>{message}</p>
        <p><b>Target Depth:</b> {targetDepth.toFixed(2)} m</p>
        <p><b>Current Depth:</b> {sim.pos.y.toFixed(2)} m</p>
        <p><b>Floats:</b> {floatCount} | <b>Weights:</b> {weightCount}</p>
        <ul>
          <li><b>Space</b>: Add Float (increase buoyancy)</li>
          <li><b>Shift</b>: Add Weight (increase sinking)</li>
          <li><b>W/A/S/D</b>: Swim horizontally</li>
        </ul>
      </div>

      {/* Crosshair */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: 20, height: 20, transform: "translate(-50%, -50%)",
        pointerEvents: "none"
      }}>
        <div style={{position: "absolute", top: "50%", left: 0, width: "100%", height: 2, background: "white"}}/>
        <div style={{position: "absolute", left: "50%", top: 0, width: 2, height: "100%", background: "white"}}/>
      </div>
    </div>
  )
}