import {useMemo,useRef} from "react"
export default function useWaterField(cfg={}){
  const C=useMemo(()=>({
    ampXZ:cfg.ampXZ??0.18,
    ampY:cfg.ampY??0.06,
    f1:cfg.f1??0.05,
    f2:cfg.f2??0.075,
    fY:cfg.fY??0.09,
    kx:cfg.kx??0.15,
    kz:cfg.kz??0.12,
    rollScale:cfg.rollScale??0.02,
    pitchScale:cfg.pitchScale??0.018
  }),[cfg])
  const t=useRef(0)
  const p1=useRef(Math.random()*Math.PI*2)
  const p2=useRef(Math.random()*Math.PI*2)
  const p3=useRef(Math.random()*Math.PI*2)
  return{
    step(dt){t.current+=dt},
    sample(x,z){
      const w1=2*Math.PI*C.f1*t.current
      const w2=2*Math.PI*C.f2*t.current
      const vx=C.ampXZ*(Math.sin(w1+C.kx*x+p1.current)+0.5*Math.sin(w2+C.kz*z))
      const vz=C.ampXZ*(Math.cos(w1+C.kz*z+p2.current)+0.5*Math.cos(w2+C.kx*x))
      const vy=C.ampY*Math.sin(2*Math.PI*C.fY*t.current+p3.current)
      return{vx,vz,vy}
    },
    cameraTiltFrom(vx,vz){
      const roll=vx*C.rollScale
      const pitch=-vz*C.pitchScale
      return{roll,pitch}
    }
  }
}
