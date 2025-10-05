// src/common/StageShell.jsx
import { Canvas } from "@react-three/fiber";
import { PointerLockControls, Environment } from "@react-three/drei";
import { useSim } from "./SimContext";
export default function StageShell({ camera, envPreset="warehouse", children, title, hudExtra }) {
  const { locked, setLocked } = useSim();
  return (
    <div style={{position:"fixed",inset:0,background:"#000"}}>
      {!locked && (
        <div onClick={()=>document.querySelector("canvas")?.dispatchEvent(new MouseEvent("click",{bubbles:true}))}
             style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"rgba(0,0,0,0.7)",color:"#fff",padding:"12px 20px",borderRadius:10,cursor:"pointer",zIndex:10}}>
          클릭해서 시작 (WASD / Space·Shift / E·R)
        </div>
      )}
      {title}
      <Canvas camera={camera}>
        {children}
        <Environment preset={envPreset}/>
        <PointerLockControls onLock={()=>setLocked(true)} onUnlock={()=>setLocked(false)}/>
      </Canvas>
    </div>
  );
}
//