import "./Cupola.css";
import React, { Suspense, useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, useGLTF, Stars, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";


function gmstRadians(date){
  const JD = date.getTime()/86400000 + 2440587.5;
  const T  = (JD - 2451545)/36525;
  let g = 67310.54841 + (876600*3600 + 8640184.812866)*T + 0.093104*T*T - 6.2e-6*T*T*T;
  g = ((g % 86400) + 86400) % 86400;
  return (g/86400) * 2 * Math.PI;
}
function eciToEcef(r, date){
  const th = gmstRadians(date), c = Math.cos(th), s = Math.sin(th);
  return new THREE.Vector3(c*r.x + s*r.y, -s*r.x + c*r.y, r.z);
}
function ecefToLla(r){
  const a=6378.137, e2=6.69437999014e-3;
  let {x,y,z} = r;
  let lon = Math.atan2(y,x);
  let p = Math.sqrt(x*x+y*y);
  let lat = Math.atan2(z, p*(1-e2));
  for(let i=0;i<5;i++){
    const N = a/Math.sqrt(1 - e2*Math.sin(lat)**2);
    lat = Math.atan2(z + e2*N*Math.sin(lat), p);
  }
  const N = a/Math.sqrt(1 - e2*Math.sin(lat)**2);
  const h = p/Math.cos(lat) - N;
  return { lat, lon, h };
}
function hermite1D(y0,y1,v0,v1,h,t){
  const s=t/h;
  const h00=(1+2*s)*(1-s)*(1-s), h10=s*(1-s)*(1-s),
        h01=s*s*(3-2*s),         h11=s*s*(s-1);
  return h00*y0 + h*h10*v0 + h01*y1 + h*h11*v1;
}
const toRad = (d) => THREE.MathUtils.degToRad(d);


const EARTH_TARGET_DIAMETER = 800.0;
const EARTH_SPIN_SPEED = 0.12;       
const EARTH_ABS_POS = new THREE.Vector3(0, 500, 0);
const EARTH_TILT_DEG = -45;
const EARTH_TILT_AXIS = "z";
const TIP_AXIS = "y";

const CUPOLA_PRE_PITCH_DEG = 0;
const CUPOLA_PRE_YAW_DEG = 90;
const CUPOLA_PRE_ROLL_DEG = 0;
const CUPOLA_ROLL_FIX_DEG = 0;


function FixedCameraInside() {
  const { camera, gl } = useThree();
  const camPos = new THREE.Vector3(0, 0.8, 0);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const lookDist = 2.4;
  const baseYOffset = 0.3;
  const pitchNeutralDeg = -4;
  const curDir = useRef(new THREE.Vector3(0, 0, -1));
  const lerpFactor = 0.1;

  useEffect(() => {
    camera.position.copy(camPos);
    camera.fov = 80;
    camera.updateProjectionMatrix();

    const sensitivity = 0.0025;
    let lastX = null, lastY = null;

    const onMove = (e) => {
      if (lastX === null) { lastX = e.clientX; lastY = e.clientY; return; }
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;

      yawRef.current += dx * sensitivity;
      pitchRef.current += -dy * sensitivity;

      const maxPitch = toRad(88);
      pitchRef.current = Math.max(-maxPitch, Math.min(maxPitch, pitchRef.current));
    };
    const onLeave = () => { lastX = null; lastY = null; };

    gl.domElement.addEventListener("mousemove", onMove);
    gl.domElement.addEventListener("mouseleave", onLeave);
    return () => {
      gl.domElement.removeEventListener("mousemove", onMove);
      gl.domElement.removeEventListener("mouseleave", onLeave);
    };
  }, [camera, gl]);

  useFrame(() => {
    const yaw = yawRef.current;
    const pitch = pitchRef.current + toRad(pitchNeutralDeg);
    const targetDir = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch)
    );
    curDir.current.lerp(targetDir, lerpFactor);

    camera.position.copy(camPos);
    const look = new THREE.Vector3().copy(camPos).add(
      new THREE.Vector3(
        curDir.current.x * lookDist,
        curDir.current.y * lookDist + baseYOffset,
        curDir.current.z * lookDist
      )
    );
    camera.lookAt(look);
  });

    return null;
}


function CupolaModel() {
  const base = import.meta.env.BASE_URL || "/";
  const { scene } = useGLTF("/cupola.glb");

  const euler = new THREE.Euler(
    toRad(CUPOLA_PRE_PITCH_DEG),
    toRad(CUPOLA_PRE_YAW_DEG),
    toRad(CUPOLA_PRE_ROLL_DEG + CUPOLA_ROLL_FIX_DEG),
    "YXZ"
  );
  scene.rotation.copy(euler);
  scene.position.set(0, 0, 0);

  return <primitive object={scene} scale={[1, 1, 1]} />;
}
useGLTF.preload("/cupola.glb");


function Earth({ position = EARTH_ABS_POS }) {
  const base = import.meta.env.BASE_URL || "/";
  const root = useRef();
  const { scene } = useGLTF("/earth.glb");
  const model = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  useEffect(() => {
    if (!root.current) return;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const s = EARTH_TARGET_DIAMETER / (Math.max(size.x, size.y, size.z) || 1);
    root.current.scale.setScalar(s);
  }, [model]);

  const { actions } = useAnimations(animations, model);
  useEffect(() => {
    Object.values(actions || {}).forEach(a =>
      a.reset().setLoop(THREE.LoopRepeat, Infinity).play()
    );
  }, [actions]);


  useFrame((_, dt) => {
    if (!actions || Object.keys(actions).length === 0) {
      if (root.current) root.current.rotation.y += toRad(EARTH_SPIN_SPEED) * dt;
    }
  });

  useEffect(() => {
    model.traverse(o => {
      if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; }
    });
  }, [model]);

  const tilt = [
    EARTH_TILT_AXIS === "x" ? toRad(EARTH_TILT_DEG) : 0,
    EARTH_TILT_AXIS === "y" ? toRad(EARTH_TILT_DEG) : 0,
    EARTH_TILT_AXIS === "z" ? toRad(EARTH_TILT_DEG) : 0,
  ];

  return (
    <group ref={root} position={position.toArray()}>
      <group rotation={tilt}>
        <primitive object={model} />
      </group>
    </group>
  );
}
useGLTF.preload("/earth.glb");


function CupolaISS({ earthPos = EARTH_ABS_POS, scaleKmToScene = 0.001 }) {
  const group = useRef();
  const { camera } = useThree();

  const qPre = useMemo(() => {
    const e = new THREE.Euler(
      toRad(CUPOLA_PRE_PITCH_DEG),
      toRad(CUPOLA_PRE_YAW_DEG),
      toRad(CUPOLA_PRE_ROLL_DEG),
      "XYZ"
    );
    return new THREE.Quaternion().setFromEuler(e);
  }, []);
  
  const qTipAlign = useMemo(() => {
    const tipLocal = TIP_AXIS === "y" ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    return new THREE.Quaternion().setFromUnitVectors(tipLocal, new THREE.Vector3(0, 0, 1));
  }, []);
  
  const placedOnce = useRef(false);

  useFrame(() => {
    if (!group.current) return;

    const rEci = new THREE.Vector3(0, EARTH_ABS_POS.y + 100, 0);
    const v    = new THREE.Vector3(0.5, 0, 1);
    const now  = new Date();
    const r    = eciToEcef(rEci, now);

    const z = r.clone().multiplyScalar(-1).normalize();
    const y = z.clone().cross(v).normalize();
    const x = y.clone().cross(z).normalize();

    const mLVLH = new THREE.Matrix4().makeBasis(x, y, z);
    const qLVLH = new THREE.Quaternion().setFromRotationMatrix(mLVLH);
    const qRollFix = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), toRad(CUPOLA_ROLL_FIX_DEG));

    const posScene = r.clone().multiplyScalar(scaleKmToScene);
    const worldPos = new THREE.Vector3(
      earthPos.x + posScene.x,
      earthPos.y + posScene.z,
      earthPos.z + posScene.y
    );

    
    group.current.position.copy(worldPos);
    group.current.quaternion.copy(qLVLH).multiply(qTipAlign).multiply(qRollFix).multiply(qPre);

    if (!placedOnce.current) {
      const tipDirWorld = new THREE.Vector3(0, 0, 1).applyQuaternion(group.current.quaternion);
      const upWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(group.current.quaternion);
      const camPos = worldPos.clone()
        .add(tipDirWorld.clone().multiplyScalar(2.0))
        .add(upWorld.clone().multiplyScalar(0.5));
      camera.position.copy(camPos);
      camera.lookAt(worldPos.clone().add(tipDirWorld));
      placedOnce.current = true;
    }
  });

  return (
    <group ref={group}>
      <CupolaModel />
    </group>
  );
}


export default function Cupola() {
  return (
    <div className="fullscreen-canvas">
      <Canvas shadows gl={{ antialias: true }}>
        <color attach="background" args={["#000"]} />
        <Stars radius={400} depth={80} count={20000} factor={4} fade />

        <hemisphereLight intensity={0.9} color="#fff" groundColor="#222" />
        <spotLight position={[0, 1.6, 0]} angle={1.0} penumbra={0.6} intensity={1.4} />
        <pointLight position={[0, 1.0, 0]} intensity={0.8} distance={6} />
        <directionalLight position={[2, 3, 1]} intensity={0.6} />

        <Suspense fallback={<Html center style={{ color: "#fff" }}>Loading…</Html>}>
          <FixedCameraInside />
          <Earth />
          <CupolaISS />
        </Suspense>
      </Canvas>
    </div>
  );
}