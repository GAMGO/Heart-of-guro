import React, { useState } from "react";
import StartScreen from "./components/StartScreen.jsx";
import IntroScreen from "./components/introScreen.jsx";
import Stage1 from "./components/stages/Stage1.jsx";
import Stage2 from "./components/stages/Stage2.jsx";
import Stage3 from "./components/stages/Stage3.jsx";
import Cupola from "./components/stages/Cupola.jsx";

export default function App() {
  // 현재 화면(scene): splash → intro → stage 순서로 진행
  const [scene, setScene] = useState("splash");

  // 진행 중인 스테이지(stage): stage1~3, cupola
  const [stage, setStage] = useState("stage1");

  // Stage3일 때만 배경 클래스를 따로 적용
  const rootClass = scene === "stage" && stage === "stage3" ? "stage-stage3" : "";

  // 현재 선택된 스테이지에 맞는 컴포넌트를 반환
  const renderStage = () => {
    switch (stage) {
      case "stage1":
        return <Stage1 />;
      case "stage2":
        return <Stage2 />;
      case "stage3":
        return <Stage3 />;
      case "cupola":
        return <Cupola />;
      default:
        return null;
    }
  };

  return (
    <div className={rootClass}>
      {/* 1️⃣ 시작 화면 */}
      {scene === "splash" && (
        <StartScreen
          // START 버튼 클릭 시 → 인트로 스토리로 이동
          onStart={(selected) => {
            setStage(selected || "stage1");
            setScene("intro");
          }}
          // 스테이지 바로 이동 버튼 (개발용)
          onJump={(s) => {
            setStage(s);
            setScene("stage");
          }}
        />
      )}

      {/* 2️⃣ 인트로 스토리 화면 */}
      {scene === "intro" && (
        <IntroScreen
          // 인트로 끝나면 자동으로 stage 화면으로 이동
          onFinish={() => {
            setScene("stage");
          }}
        />
      )}

      {/* 3️⃣ 실제 스테이지 화면 */}
      {scene === "stage" && renderStage()}
    </div>
  );
}
