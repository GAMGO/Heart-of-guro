import {useMemo,useRef} from "react"
export default function useVerticalHydroReal(cfg){
  const C=useMemo(()=>({...cfg}),[cfg])
  const s=useRef({y:1.75,vy:0,t:0})
  const api=useMemo(()=>({
    get y(){return s.current.y},
    get vy(){return s.current.vy},
    setY(v){s.current.y=v},
    setVY(v){s.current.vy=v},
    setBallastKg(v){C.ballastKg=v},
    addBallast(n=1){C.ballastKg+=C.ballastStepKg*n},
    removeBallast(n=1){C.ballastKg=Math.max(0,C.ballastKg-C.ballastStepKg*n)},
    step(dt){
      const m=C.astronautMass+C.suitMass+C.equipmentMass+C.ballastKg
      const meff=m+C.Ca_vert*C.rho*C.rigidVolume
      const B=C.rho*C.g*C.rigidVolume
      const W=m*C.g
      const vy=s.current.vy
      const Fd=0.5*C.rho*C.Cd_vert*C.A_vert*vy*Math.abs(vy)
      const Fl=C.linearDamp*vy
      const F=B-W-Fd-Fl
      const ay=F/meff
      const newVy=vy+ay*dt
      const newY=s.current.y+newVy*dt
      s.current.vy=newVy
      s.current.y=newY
      s.current.t+=dt
      return{y:newY,vy:newVy,B,W,F}
    }
  }),[C])
  return api
}
