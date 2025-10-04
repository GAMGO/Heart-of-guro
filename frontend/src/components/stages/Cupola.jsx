import React, { Suspense, useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Environment, Lightformer, Html, useProgress, Line, useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

const EARTH_TARGET_DIAMETER = 800.0;
const EARTH_SPIN_SPEED = 0.12;
const EARTH_ABS_POS = new THREE.Vector3(0, 500, 0);
const EARTH_TILT_DEG = -45;
const EARTH_TILT_AXIS = "z";
const toRad = (d) => THREE.MathUtils.degToRad(d);

const TIP_AXIS = "y";

const CUPOLA_PRE_PITCH_DEG = 0;
const CUPOLA_PRE_YAW_DEG   = 90;
const CUPOLA_PRE_ROLL_DEG  = 0;

const CUPOLA_ROLL_FIX_DEG  = 0;

const CAM_BACK = -1.0; 
const CAM_UP   = 1.2;  

const ALTITUDE_BUMP_KM = 2000;

function Earth({position}){
  const root=useRef(); 
  const {scene,animations}=useGLTF(`${import.meta.env.BASE_URL}earth.glb`);
  const model=useMemo(()=>SkeletonUtils.clone(scene),[scene]);
  useEffect(()=>{
    if(!root.current) return;
    const box=new THREE.Box3().setFromObject(model);
    const size=box.getSize(new THREE.Vector3());
    const s=EARTH_TARGET_DIAMETER/(Math.max(size.x,size.y,size.z)||1);
    root.current.scale.setScalar(s);
  },[model]);
  const {actions}=useAnimations(animations,model);
  useEffect(()=>{Object.values(actions||{}).forEach(a=>a.reset().setLoop(THREE.LoopRepeat,Infinity).play());},[actions]);
  useFrame((_,dt)=>{if(!actions||Object.keys(actions).length===0){if(root.current) root.current.rotation.y+=EARTH_SPIN_SPEED*dt;}});
  useEffect(()=>{model.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;}});},[model]);
  const tilt=[EARTH_TILT_AXIS==="x"?toRad(EARTH_TILT_DEG):0,EARTH_TILT_AXIS==="y"?toRad(EARTH_TILT_DEG):0,EARTH_TILT_AXIS==="z"?toRad(EARTH_TILT_DEG):0];
  return <group ref={root} position={position.toArray()}><group rotation={tilt}><primitive object={model}/></group></group>;
}

function CupolaModel(){ const {scene}=useGLTF(`${import.meta.env.BASE_URL}cupola.glb`); return <primitive object={scene} scale={2}/>;}

function CupolaISS({earthPos, scaleKmToScene, states, controlsRef}) {
  const group = useRef();
  const { camera } = useThree();

  const qPre = useMemo(()=>{
    const e = new THREE.Euler(toRad(CUPOLA_PRE_PITCH_DEG), toRad(CUPOLA_PRE_YAW_DEG), toRad(CUPOLA_PRE_ROLL_DEG), "XYZ");
    return new THREE.Quaternion().setFromEuler(e);
  },[]);

  const qTipAlign = useMemo(()=>{
    const tipLocal = TIP_AXIS === "y" ? new THREE.Vector3(0,1,0) : new THREE.Vector3(0,0,1);
    return new THREE.Quaternion().setFromUnitVectors(tipLocal, new THREE.Vector3(0,0,1));
  },[]);

const placedOnce = useRef(false);

  useFrame(()=>{
    if(!states || !states.length || !group.current) return;
    const now = new Date();
    const { r, v } = interpRV(states, now);

    const z = r.clone().multiplyScalar(-1).normalize();
    const y = z.clone().cross(v).normalize();
    const x = y.clone().cross(z).normalize();

    const mLVLH = new THREE.Matrix4().makeBasis(x, y, z);
    const qLVLH = new THREE.Quaternion().setFromRotationMatrix(mLVLH);
    const qRollFix = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), toRad(CUPOLA_ROLL_FIX_DEG));

    const rDraw = r.clone().setLength(r.length() + ALTITUDE_BUMP_KM);
    const posScene = rDraw.multiplyScalar(scaleKmToScene);
    
    const worldPos = new THREE.Vector3(
      earthPos.x + posScene.x,
      earthPos.y + posScene.y,
      earthPos.z + posScene.z
    );

    group.current.position.copy(worldPos);
    group.current.quaternion.copy(qLVLH).multiply(qTipAlign).multiply(qRollFix).multiply(qPre);

    if(!placedOnce.current){
      const tipDirWorld = new THREE.Vector3(0,0,1).applyQuaternion(group.current.quaternion);
      const upWorld     = new THREE.Vector3(0,1,0).applyQuaternion(group.current.quaternion);
      const camPos = worldPos.clone()
        .add(tipDirWorld.clone().multiplyScalar(CAM_BACK))
        .add(upWorld.clone().multiplyScalar(CAM_UP));
      camera.position.copy(camPos);
      camera.lookAt(worldPos.clone().add(tipDirWorld));
      if(controlsRef?.current){
        controlsRef.current.target.copy(worldPos.clone().add(tipDirWorld));
        controlsRef.current.update();
      }
      placedOnce.current = true;
    }
  });

  return <group ref={group}><CupolaModel/></group>;
}

export default function CupolaScene(){
  const controls = useRef();
  const [earthPos] = useState(() => EARTH_ABS_POS.clone());
  const scaleKmToScene = useMemo(() => (EARTH_TARGET_DIAMETER / 2) / 6371, []);

  const OEM_FILES = [
    "iss/ISS.OEM_J2K_EPH22.02.13.xml",
    "iss/ISS.OEM_J2K_EPH22.02.15.xml",
    "iss/ISS.OEM_J2K_EPH22.02.18.xml",
    "iss/ISS.OEM_J2K_EPH22.02.20.xml",
  ];
  const states = useOEMsMergedPlusGemini(OEM_FILES, 180);

  useEffect(() => {
    if (controls.current) {
      controls.current.enableRotate = true;
      controls.current.enablePan = false;
      controls.current.enableZoom = false;
      controls.current.minPolarAngle = Math.PI / 3.5;
      controls.current.maxPolarAngle = Math.PI / 1.8;
      controls.current.minAzimuthAngle = -Math.PI / 4.5;
      controls.current.maxAzimuthAngle = Math.PI / 4.5;
      controls.current.enableDamping = true;
      controls.current.dampingFactor = 0.08;
      controls.current.rotateSpeed = 0.5;
    }
  }, []);

 return (
    <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
      <Canvas
        camera={{ position: [0,0,60], fov: 55, near: 0.1, far: 20000 }}
        gl={{ logarithmicDepthBuffer: true }}
        shadows
        onCreated={({gl})=>{
          gl.setClearColor("#000",1);
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.NoToneMapping;
          gl.physicallyCorrectLights = true;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <Stars radius={4000} depth={200} count={15000} factor={90} saturation={1} fade speed={4} />
        <ambientLight intensity={0.6}/>
        <hemisphereLight args={["#fff","#667",0.6]}/>
        <directionalLight position={[300,500,200]} intensity={2.0} color="#fffbe6" castShadow/>
        <pointLight position={[-120,-40,-80]} intensity={8} distance={1000} decay={2} color="#88bbff"/>

        <Environment preset="studio" background={false} intensity={0.25}>
          <Lightformer form="rect" intensity={1.2} color="#aecdff" scale={[400,120,1]} position={[0,300,0]} />
          <Lightformer form="rect" intensity={0.9} color="#cfe0ff" scale={[260,90,1]} position={[260,210,0]} rotation={[0,-Math.PI/8,0]}/>
          <Lightformer form="rect" intensity={0.9} color="#cfe0ff" scale={[260,90,1]} position={[-260,210,0]} rotation={[0,Math.PI/8,0]}/>
        </Environment>
       <Suspense fallback={<LoaderOverlay/>}>
          <Earth position={earthPos}/>
          {states && (
            <>
              <GroundTrack earthPos={earthPos} scaleKmToScene={scaleKmToScene} states={states}/>
              <CupolaISS earthPos={earthPos} scaleKmToScene={scaleKmToScene} states={states} controlsRef={controls}/>
            </>
          )}
        </Suspense>

        <OrbitControls ref={controls}/>
      </Canvas>
    </div>
  );
}

