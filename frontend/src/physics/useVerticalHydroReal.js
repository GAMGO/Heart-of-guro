import {useMemo,useRef} from "react"
export default function useVerticalHydroReal(cfg){
  const C=useMemo(()=>({
    mode:cfg.mode??"EMU_NBL",
    rho:cfg.rho??996.5,
    g:cfg.g??9.81,
    astronautMass:cfg.astronautMass??82.9,
    suitMass:cfg.suitMass??145,
    equipmentMass:cfg.equipmentMass??0,
    ballastKg:cfg.ballastKg??0,
    ballastStepKg:cfg.ballastStepKg??1,
    rigidVolume:cfg.rigidVolume??(((cfg.astronautMass??82.9)+(cfg.suitMass??145))/(cfg.rho??996.5)),
    Cd_vert:cfg.Cd_vert??1.0,
    A_vert:cfg.A_vert??0.35,
    Ca_vert:cfg.Ca_vert??0.18,
    linearDamp:cfg.linearDamp??12,
    microBuoyancyLiters:cfg.microBuoyancyLiters??0.4,
    microHz:cfg.microHz??0.06
  }),[cfg])
  const s=useRef({y:1.75,vy:0,t:0})
  const api={
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
      const Vmicro=(C.microBuoyancyLiters/1000)*Math.sin(2*Math.PI*C.microHz*s.current.t)
      const V=C.rigidVolume+Vmicro
      const B=C.rho*C.g*V
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
  }
  return api
}
