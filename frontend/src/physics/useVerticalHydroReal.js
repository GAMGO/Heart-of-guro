import { useMemo, useRef, useEffect } from "react"
import * as THREE from "three"

export default function useVerticalHydroReal(cfg) {
  const C = useMemo(() => ({
    mode: cfg.mode ?? "EMU_NBL",     // ✅ 모드 기본값 추가
    rho: cfg.rho ?? 996.5,
    g: cfg.g ?? 9.81,
    astronautMass: cfg.astronautMass ?? 82.9,
    suitMass: cfg.suitMass ?? 145,
    equipmentMass: cfg.equipmentMass ?? 0,
    ballastKg: cfg.ballastKg ?? 0,
    ballastStepKg: cfg.ballastStepKg ?? 1,
    rigidVolume:
      cfg.rigidVolume ??
      ((cfg.astronautMass ?? 82.9) + (cfg.suitMass ?? 145)) /
        (cfg.rho ?? 996.5),
    Cd: cfg.Cd ?? 1.0, // 저항 계수
    A: cfg.A ?? 0.35,  // 단면적
    Ca: cfg.Ca ?? 0.18,// 가상 질량 계수
    microBuoyancyLiters: cfg.microBuoyancyLiters ?? 0.4,
    microHz: cfg.microHz ?? 0.06,
    targetSpeed: cfg.targetSpeed ?? 1.0,   // 전후진 최대 속도
    verticalSpeed: cfg.verticalSpeed ?? 0.5, // 위/아래 속도
    lerpFactor: cfg.lerpFactor ?? 2.0,     // 목표 속도로 보정하는 반응 속도
  }), [cfg])

  const s = useRef({
    x: 0,
    y: 1.75,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    t: 0,
  })
  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
    shift: false,
  })

  useEffect(() => {
    const down = (e) => {
      if (e.code === "KeyW") keys.current.w = true
      if (e.code === "KeyA") keys.current.a = true
      if (e.code === "KeyS") keys.current.s = true
      if (e.code === "KeyD") keys.current.d = true
      if (e.code === "Space") { e.preventDefault(); keys.current.space = true }
      if (e.code === "ShiftLeft") keys.current.shift = true
    }
    const up = (e) => {
      if (e.code === "KeyW") keys.current.w = false
      if (e.code === "KeyA") keys.current.a = false
      if (e.code === "KeyS") keys.current.s = false
      if (e.code === "KeyD") keys.current.d = false
      if (e.code === "Space") { e.preventDefault(); keys.current.space = false }
      if (e.code === "ShiftLeft") keys.current.shift = false
    }

    document.addEventListener("keydown", down)
    document.addEventListener("keyup", up)

    return () => {
      document.removeEventListener("keydown", down)
      document.removeEventListener("keyup", up)
    }
  }, [])

  const api = {
    get mode() {
      return C.mode        // ✅ 현재 모드 확인 가능
    },
    get pos() {
      return { x: s.current.x, y: s.current.y, z: s.current.z }
    },
    get vel() {
      return { vx: s.current.vx, vy: s.current.vy, vz: s.current.vz }
    },

    step(
      dt,
      forward = new THREE.Vector3(0, 0, -1),
      right = new THREE.Vector3(1, 0, 0)
    ) {
      // 목표 속도 결정
      let desiredVx = 0, desiredVz = 0
      if (keys.current.w) {
        desiredVx += forward.x * C.targetSpeed
        desiredVz += forward.z * C.targetSpeed
      }
      if (keys.current.s) {
        desiredVx -= forward.x * C.targetSpeed
        desiredVz -= forward.z * C.targetSpeed
      }
      if (keys.current.d) {
        desiredVx += right.x * C.targetSpeed
        desiredVz += right.z * C.targetSpeed
      }
      if (keys.current.a) {
        desiredVx -= right.x * C.targetSpeed
        desiredVz -= right.z * C.targetSpeed
      }

      let desiredVy = 0
      if (keys.current.space) desiredVy += C.verticalSpeed
      if (keys.current.shift) desiredVy -= C.verticalSpeed

      // 속도를 목표 속도로 부드럽게 보정
      s.current.vx += (desiredVx - s.current.vx) * C.lerpFactor * dt
      s.current.vy += (desiredVy - s.current.vy) * C.lerpFactor * dt
      s.current.vz += (desiredVz - s.current.vz) * C.lerpFactor * dt

      // 작은 속도는 클램프
      if (Math.abs(s.current.vx) < 0.01) s.current.vx = 0
      if (Math.abs(s.current.vy) < 0.01) s.current.vy = 0
      if (Math.abs(s.current.vz) < 0.01) s.current.vz = 0

      // 위치 업데이트
      s.current.x += s.current.vx * dt
      s.current.y += s.current.vy * dt
      s.current.z += s.current.vz * dt
      s.current.t += dt

      return { ...api.pos, ...api.vel }
    },
  }

  return api
}