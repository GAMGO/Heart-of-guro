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
    const d = (e) => { if (e.code === "KeyE") { eRef.current = true; e.preventDefault() } }
    const u = (e) => { if (e.code === "KeyE") eRef.current = false }
    window.addEventListener("keydown", d, { passive: false })
    window.addEventListener("keyup", u, { passive: false })
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

function Stage3Inner({ setWaterUI, onPositionUpdate }) {
  const { camera, gl, scene } = useThree()
  const gltf = useGLTF("/pool.glb")
  const poolRef = useRef()
  const mixerRef = useRef(null)
  const actionsRef = useRef({})
  const [ready, setReady] = useState(false)
  const [colliderData, setColliderData] = useState([])

  const worldBox = useRef(new THREE.Box3())
  const ceilY = useRef(12)
  const doorState = useRef("CLOSED")
  const busy = useRef(false)
  const edgeE = useEdgeE()

  const sim = useVerticalHydroReal(
    buildEmuNblConfig({
      startX: SPAWN_POS.x,
      startY: SPAWN_POS.y,
      startZ: SPAWN_POS.z,
      minY: 1.75,
      colliders: colliderData,
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
      a.time = 0
      map[key] = a
    }
    actionsRef.current = map
    const getFirst = (...names) => names.map((n) => map[n]).find(Boolean) || null
    doorKeysRef.current = {
      open: getFirst("open", "dooropen"),
      opened: getFirst("opened", "dooropened"),
      close: getFirst("close", "doorclose"),
      closed: getFirst("closed", "doorclosed"),
    }
  }

  const stopAll = () => { Object.values(actionsRef.current).forEach((a) => { if (a) { a.stop(); a.enabled = false } }) }
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
  const playOnce = (action) => new Promise((res) => {
    if (!action) { res(); return }
    stopAll()
    action.enabled = true
    action.reset()
    action.setLoop(THREE.LoopOnce, 1)
    action.setEffectiveTimeScale(1)
    action.setEffectiveWeight(1)
    action.play()
    const onFinish = (e) => {
      if (e.action === action) {
        mixerRef.current.removeEventListener("finished", onFinish)
        res()
      }
    }
    mixerRef.current.addEventListener("finished", onFinish)
  })

  useEffect(() => {
    const s = gltf.scene
    poolRef.current = s
    s.updateMatrixWorld(true)
    const colliders = []
    s.traverse((o) => {
      if (!o.isMesh) return
      const n = (o.name || "").toLowerCase()
      const c = o.material?.color
      const m = c && Math.abs(c.r - 1) + Math.abs(c.g - 0) + Math.abs(c.b - 1) < 0.4
      const isCollider = n.includes("collider") || n.includes("collision") || m
      if (isCollider) {
        if (o.geometry.isBufferGeometry) {
          colliders.push({ geometry: o.geometry, matrix: o.matrixWorld.clone() })
        }
      }
    })
    const combined = [...colliders, { geometry: customColliderGeometry, matrix: customColliderMatrix }]
    setColliderData(combined)
    worldBox.current.setFromObject(s)
    ceilY.current = worldBox.current.max.y - pad
    camera.position.copy(SPAWN_POS)
    const dom = gl.domElement
    const lock = () => { if (document.pointerLockElement !== dom) dom.requestPointerLock?.() }
    dom.addEventListener("click", lock)
    scene.fog = new THREE.FogExp2("#a3d7ff", 0.0)
    gl.setClearColor("#87cefa", 1)
    buildActions()
    const { closed, close, opened, open } = doorKeysRef.current
    if (closed) setPoseEnd(closed)
    else if (close) setPoseEnd(close)
    else if (opened) setPoseEnd(opened)
    else if (open) setPoseEnd(open)
    sim.setPosition(SPAWN_POS.x, SPAWN_POS.y, SPAWN_POS.z)
    const kd = (e) => sim.onKeyDown(e)
    const ku = (e) => sim.onKeyUp(e)
    window.addEventListener("keydown", kd, { passive: false })
    window.addEventListener("keyup", ku, { passive: false })
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
  })

  useEffect(() => {
    let cancel = false
    const handleToggle = async () => {
      if (!edgeE() || busy.current) return
      busy.current = true
      const { open, opened, close, closed } = doorKeysRef.current
      if (doorState.current === "CLOSED") {
        await playOnce(open)
        if (!cancel) setPoseEnd(opened || open)
        if (!cancel) doorState.current = "OPENED"
      } else if (doorState.current === "OPENED") {
        await playOnce(close)
        if (!cancel) setPoseEnd(closed || close)
        if (!cancel) doorState.current = "CLOSED"
      } else if (doorState.current === "OPENING" || doorState.current === "CLOSING") {
      } else {
        if (doorState.current !== "OPENED") {
          await playOnce(open)
          if (!cancel) setPoseEnd(opened || open)
          if (!cancel) doorState.current = "OPENED"
        } else {
          await playOnce(close)
          if (!cancel) setPoseEnd(closed || close)
          if (!cancel) doorState.current = "CLOSED"
        }
      }
      setTimeout(() => { if (!cancel) busy.current = false }, 120)
    }
    const id = setInterval(handleToggle, 16)
    return () => { cancel = true; clearInterval(id) }
  }, [])

  return (
    <>
      <primitive ref={poolRef} object={gltf.scene} />
      <mesh position={RING_POS} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.02, 16, 64]} />
        <meshBasicMaterial color={RING_COLOR} transparent opacity={0.9} />
      </mesh>
      <mesh name="spaceship_uv_collider_visual" position={[-5.489, 0, -8.0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[4, 4, 0.5]} />
        <meshBasicMaterial color="red" />
      </mesh>
    </>
  )
}

export default function Stage3() {
  const [inWater, setInWater] = useState(false)
  const [locked, setLocked] = useState(false)
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#000" }}>
      {!locked && (
        <div className="lock-hint" onClick={() => document.querySelector("canvas")?.dispatchEvent(new MouseEvent("click", { bubbles: true }))}>
          클릭해서 조작 시작 (WASD, Shift, E)
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
      {inWater && (
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse at 50% 20%, rgba(150,220,255,0.15) 0%, rgba(100,180,255,0.25) 60%, rgba(60,140,200,0.35) 100%)", mixBlendMode:"screen", transition:"opacity 180ms ease", opacity:1 }} />
      )}
      <Canvas camera={{ position: [SPAWN_POS.x, SPAWN_POS.y, SPAWN_POS.z], fov: 60 }}>
        <Suspense fallback={null}>
          <Stage3Inner
            setWaterUI={setInWater}
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
