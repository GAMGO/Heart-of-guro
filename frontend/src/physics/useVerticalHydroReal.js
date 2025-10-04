import { useMemo, useRef } from "react"
import * as THREE from "three"

export default function useVerticalHydroReal(cfg) {
  const C = useMemo(() => ({
    mode: cfg.mode ?? "EMU_NBL",
    rho: cfg.rho ?? 996.5,
    g: cfg.g ?? 9.81,
    astronautMass: cfg.astronautMass ?? 82.9,
    suitMass: cfg.suitMass ?? 145,
    equipmentMass: cfg.equipmentMass ?? 0,
    ballastKg: cfg.ballastKg ?? 0,
    ballastStepKg: cfg.ballastStepKg ?? 1,
    rigidVolume: cfg.rigidVolume ?? ((cfg.astronautMass ?? 82.9) + (cfg.suitMass ?? 145)) / (cfg.rho ?? 996.5),
    Cd: cfg.Cd ?? 1.0,
    A: cfg.A ?? 0.35,
    Ca: cfg.Ca ?? 0.18,
    microBuoyancyLiters: cfg.microBuoyancyLiters ?? 0.4,
    microHz: cfg.microHz ?? 0.06,
    targetSpeed: cfg.targetSpeed ?? 1.5,
    verticalSpeed: cfg.verticalSpeed ?? 1.25,
    lerpXY: cfg.lerpXY ?? 8.0,
    lerpY: cfg.lerpY ?? 16.0,
    minY: cfg.minY ?? 1.75,
  }), [cfg])

  const s = useRef({
    x: cfg.startX ?? 0,
    y: cfg.startY ?? C.minY,
    z: cfg.startZ ?? 0,
    vx: 0,
    vy: 0,
    vz: 0,
    t: 0,
  })

  const keys = useRef({ w:false,a:false,s:false,d:false,space:false,shift:false })

  const onKeyDown = (e) => {
    if (e.code === "KeyW") keys.current.w = true
    if (e.code === "KeyA") keys.current.a = true
    if (e.code === "KeyS") keys.current.s = true
    if (e.code === "KeyD") keys.current.d = true
    if (e.code === "Space") { e.preventDefault(); keys.current.space = true }
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") { e.preventDefault(); keys.current.shift = true }
  }

  const onKeyUp = (e) => {
    if (e.code === "KeyW") keys.current.w = false
    if (e.code === "KeyA") keys.current.a = false
    if (e.code === "KeyS") keys.current.s = false
    if (e.code === "KeyD") keys.current.d = false
    if (e.code === "Space") { e.preventDefault(); keys.current.space = false }
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") { e.preventDefault(); keys.current.shift = false }
  }

  const api = useMemo(() => ({
    get mode() { return C.mode },
    get pos() { return { x: s.current.x, y: s.current.y, z: s.current.z } },
    get vel() { return { vx: s.current.vx, vy: s.current.vy, vz: s.current.vz } },
    setPosition(x, y, z) {
      s.current.x = x ?? s.current.x
      s.current.y = y ?? s.current.y
      s.current.z = z ?? s.current.z
    },
    onKeyDown,
    onKeyUp,
    step(dt, forward = new THREE.Vector3(0, 0, -1), right = new THREE.Vector3(1, 0, 0)) {
      let dvx = 0, dvz = 0
      if (keys.current.w) { dvx += forward.x * C.targetSpeed; dvz += forward.z * C.targetSpeed }
      if (keys.current.s) { dvx -= forward.x * C.targetSpeed; dvz -= forward.z * C.targetSpeed }
      if (keys.current.d) { dvx -= right.x * C.targetSpeed; dvz -= right.z * C.targetSpeed }
      if (keys.current.a) { dvx += right.x * C.targetSpeed; dvz += right.z * C.targetSpeed }
      let dvy = 0
      if (keys.current.space) dvy += C.verticalSpeed
      if (keys.current.shift) dvy -= C.verticalSpeed
      s.current.vx += (dvx - s.current.vx) * C.lerpXY * dt
      s.current.vz += (dvz - s.current.vz) * C.lerpXY * dt
      if (Math.sign(s.current.vy) !== Math.sign(dvy)) s.current.vy = dvy
      else s.current.vy += (dvy - s.current.vy) * C.lerpY * dt
      s.current.x += s.current.vx * dt
      s.current.y += s.current.vy * dt
      s.current.z += s.current.vz * dt
      if (s.current.y < C.minY) { s.current.y = C.minY; if (s.current.vy < 0) s.current.vy = 0 }
      s.current.t += dt
      return { x:s.current.x, y:s.current.y, z:s.current.z, vx:s.current.vx, vy:s.current.vy, vz:s.current.vz }
    },
  }), [C])

  return api
}
