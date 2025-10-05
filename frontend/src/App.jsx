import React, { useState, useRef } from "react";
import StartScreen from "./components/StartScreen.jsx";
import IntroScreen from "./components/introScreen.jsx";
import StageLayout from "./components/StageLayout.jsx";
import Stage1 from "./components/stages/Stage1.jsx";
import Stage2 from "./components/stages/Stage2.jsx";
import Stage3 from "./components/stages/Stage3.jsx";
import Cupola from "./components/stages/Cupola.jsx";

export default function App() {
  const [scene, setScene] = useState("splash");
  const [stage, setStage] = useState("stage1");
  const stageRef = useRef(null);

  // 스테이지별 컴포넌트 매핑
  const stageMap = {
    stage1: <Stage1 ref={"Stage1"} />,
    stage2: <Stage2 ref={"Stage2"} />,
    stage3: <Stage3 ref={"Stage3"} />,
    cupola: <Cupola ref={"Cupola"} />,
  };

  const rootClass = scene === "stage" && stage === "stage3" ? "stage-stage3" : "";

  // 화면 전환 로직
  return (
    <div className={rootClass}>
      {scene === "splash" && (
        <StartScreen
          onStart={(selected) => {
            setStage(selected || "stage1");
            setScene("introScreen");
          }}
          onStage={(s) => {
            setStage(s);
            setScene("stage");
          }}
          onCupola={() => {
            setStage("cupola");
            setScene("stage");
          }}
        />
      )}

      {scene === "stage" && (
        <>
          {stageMap[stage] || null}
        </>
      )}
    </div>
  );
}
