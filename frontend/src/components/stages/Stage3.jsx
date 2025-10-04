// src/components/stages/Stage3.jsx
import React, { Suspense, useEffect, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { PointerLockControls, Environment, useGLTF } from "@react-three/drei"
import * as THREE from "three"
import useVerticalHydroReal from "../../physics/useVerticalHydroReal"
import { buildEmuNblConfig } from "../../physics/nasaPresets"
import "./Stage3.css"

useGLTF.preload("/pool.glb")

const SPAWN_POS = new THREE.Vector3(-1.02, 1.75, 15.06)
const RING_POS = new THREE.Vector3(-5.489, 0, -7.946)
const RING_COLOR = "#ff3030"
const pad = 0.25

function useEdgeE() {
  const eRef = useRef(false)
  const prev = useRef(false)
  useEffect(() => {
    const d = (e) => { if (e.code === "KeyE") eRef.current = true }
    const u = (e) => { if (e.code === "KeyE") eRef.current = false }
    window.addEventListener("keydown", d, { passive:false })
    window.addEventListener("keyup", u, { passive:false })
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u) }
  }, [])
  return () => {
    const now = eRef.current, was = prev.current
    prev.current = now
    return now && !was
  }
}

const customColliderGeometry = new THREE.BoxGeometry(4, 4, 0.5)
const customColliderMatrix = new THREE.Matrix4().makeTranslation(-5.489, 0, -8.0)

function Stage3Inner({ onPositionUpdate }) {
  const { camera, gl, scene } = useThree()
  const gltf = useGLTF("/pool.glb")
  const poolRef = useRef()
  const mixerRef = useRef(null)
  const actionsRef = useRef({})
  const [ready, setReady] = useState(false)

  const worldBox = useRef(new THREE.Box3())
  const ceilY = useRef(12)
  const doorState = useRef("CLOSED")
  const edgeE = useEdgeE()

  const sim = useVerticalHydroReal(
    buildEmuNblConfig({
      startX: SPAWN_POS.x,
      startY: SPAWN_POS.y,
      startZ: SPAWN_POS.z,
      minY: 1.75,
    })
  )

  const forward = new THREE.Vector3()
  const right = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)

  const norm = (n) => n.toLowerCase().replace(/^.*[|:\/\\]+/, "").replace(/\s+/g, "").trim()
  const doorKeysRef = useRef({ open: null, opened: null, close: null, closed: null })

  const buildActions = () => {
    const mixer = new THREE.AnimationMixer(poolRef.current)
    mixerRef.current = mixer
    const map = {}
    for (const clip of gltf.animations || []) {
      const key = norm(clip.name)
      const a = mixer.clipAction(clip, poolRef.current)
      a.clampWhenFinished = true
      a.enabled = true
      a.stop()
      map[key] = a
    }
    actionsRef.current = map
    const pick = (...names) => names.map((n)=>map[n]).find(Boolean) || null
    doorKeysRef.current = {
      open: pick("open","dooropen"),
      opened: pick("opened","dooropened"),
      close: pick("close","doorclose"),
      closed: pick("closed","doorclosed"),
    }
  }

  const stopAll = () => { Object.values(actionsRef.current).forEach((a) => a && a.stop()) }
  const setPoseEnd = (action) => {
    if (!action) return
    stopAll()
    action.enabled = true
    action.reset()
    action.setLoop(THREE.LoopOnce, 1)
    action.play()
    action.time = Math.max(0, (action.getClip().duration || 0) - 1e-4)
    action.paused = true
    action.setEffectiveWeight(1)
    action.setEffectiveTimeScale(0)
    if (mixerRef.current) mixerRef.current.update(0)
  }
  const playOnce = (action, cb) => {
    if (!action) { cb && cb(); return }
    action.reset()
    action.setLoop(THREE.LoopOnce, 1)
    action.setEffectiveTimeScale(1)
    action.setEffectiveWeight(1)
    action.play()
    const onFinish = (e) => {
      if (e.action === action) {
        mixerRef.current.removeEventListener("finished", onFinish)
        cb && cb()
      }
    }
    mixerRef.current.addEventListener("finished", onFinish)
  }

  useEffect(() => {
    const s = gltf.scene
    poolRef.current = s
    s.updateMatrixWorld(true)
    worldBox.current.setFromObject(s)
    ceilY.current = worldBox.current.max.y - pad
    camera.position.copy(SPAWN_POS)
    const dom = gl.domElement
    const lock = () => { if (document.pointerLockElement !== dom) dom.requestPointerLock?.() }
    dom.addEventListener("click", lock)
    scene.fog = new THREE.FogExp2("#a3d7ff", 0.0)
    gl.setClearColor("#87cefa", 1)
    buildActions()
    const { closed, close, open, opened } = doorKeysRef.current
    if (closed) setPoseEnd(closed)
    else if (close) setPoseEnd(close)
    else if (opened) setPoseEnd(opened)
    else if (open) setPoseEnd(open)
    sim.setPosition(SPAWN_POS.x, SPAWN_POS.y, SPAWN_POS.z)
    const kd = (e) => sim.onKeyDown(e)
    const ku = (e) => sim.onKeyUp(e)
    window.addEventListener("keydown", kd, { passive:false })
    window.addEventListener("keyup", ku, { passive:false })
    setReady(true)
    return () => {
      dom.removeEventListener("click", lock)
      window.removeEventListener("keydown", kd)
      window.removeEventListener("keyup", ku)
    }
  }, [gltf, camera, gl, scene])

  useFrame((_, dt) => {
    if (!ready) return
    if (mixerRef.current) mixerRef.current.update(dt)
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.crossVectors(forward, up).normalize()
    const { x, y, z } = sim.step(dt, forward, right)
    camera.position.set(x, y, z)
    onPositionUpdate?.({ x, y, z })
    if (edgeE()) {
      const { open, opened, close, closed } = doorKeysRef.current
      if (doorState.current === "CLOSED" || doorState.current === "CLOSING") {
        const to = open || close
        if (to) {
          doorState.current = "OPENING"
          playOnce(to, () => {
            doorState.current = "OPENED"
            setPoseEnd(opened || open || close)
          })
        }
      } else {
        const to = close || open
        if (to) {
          doorState.current = "CLOSING"
          playOnce(to, () => {
            doorState.current = "CLOSED"
            setPoseEnd(closed || close || open)
          })
        }
      }
    }
  })

  return (
    <>
      <primitive ref={poolRef} object={gltf.scene} />
      <mesh position={RING_POS} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.02, 16, 64]} />
        <meshBasicMaterial color={RING_COLOR} transparent opacity={0.9} />
      </mesh>
      <mesh name="spaceship_uv_collider_visual" position={[-5.489, 0, -8.0]} rotation={[0, 0, 0]} visible={false}>
        <boxGeometry args={[4, 4, 0.5]} />
        <meshBasicMaterial color="red" />
      </mesh>
    </>
  )
}

export default function Stage3() {
  const [locked, setLocked] = useState(false)
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#000" }}>
      {!locked && (
        <div className="lock-hint" onClick={() => document.querySelector("canvas")?.dispatchEvent(new MouseEvent("click", { bubbles: true }))}>
          클릭해서 조작 시작 (WASD, Shift, Space, E)
        </div>
      )}
      <div className="quest-panel">
        <h3>Stage 3 — 수중 해치 조작 훈련</h3>
        <div className="sub">현재 단계: 이동 및 해치 테스트</div>
        <div className="quest-card hint-card">
          <div>빨간 링으로 이동하고 E로 해치를 열고 닫아보세요</div>
        </div>
        <div className="quest-card status-card">
          <div className="quest-card-title">캐릭터 좌표</div>
          <div id="coord" className="status-info"></div>
        </div>
      </div>
      <Canvas camera={{ position: [SPAWN_POS.x, SPAWN_POS.y, SPAWN_POS.z], fov: 60 }}>
        <Suspense fallback={null}>
          <Stage3Inner
            onPositionUpdate={(v) => {
              const el = document.getElementById("coord")
              if (el) el.innerHTML = `<div>X: ${v.x.toFixed(2)}</div><div>Y: ${v.y.toFixed(2)}</div><div>Z: ${v.z.toFixed(2)}</div>`
            }}
          />
          <Environment preset="sunset" />
        </Suspense>
        <PointerLockControls onLock={() => setLocked(true)} onUnlock={() => setLocked(false)} />
      </Canvas>
    </div>
  )
}
