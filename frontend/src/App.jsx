import React, { useState } from "react";
import StartScreen from "./components/StartScreen.jsx";
import IntroScreen from "./components/introScreen.jsx";
import StageLayout from "./components/StageLayout.jsx";
import Stage1 from "./components/stages/Stage1.jsx";
import Stage2 from "./components/stages/Stage2.jsx";
import Stage3 from "./components/stages/Stage3.jsx";
import Cupola from "./components/stages/Cupola.jsx";

export default function App() {
  const [screen, setScreen] = useState("start"); // 현재 화면 상태 ("start" | "intro" | "stage")
  const [stage, setStage] = useState("stage1");  // 선택된 스테이지 이름

  // StartScreen에서 Start 버튼 클릭 시 실행
  const handleStart = (selected) => {
    setStage(selected);
    setScreen("intro"); // 인트로 컷씬으로 전환
  };

  // 인트로가 끝나면 실제 스테이지로 넘어가는 콜백
  const handleIntroEnd = () => {
    setScreen("stage");
  };

  // 스테이지별 컴포넌트 매핑
  const stageMap = {
    stage1: <Stage1 />,
    stage2: <Stage2 />,
    stage3: <Stage3 />,
    cupola: <Cupola />,
  };

  const rootClass = stage === "stage3" ? "stage-stage3" : "";

  // 화면 전환 로직
  return (
    <>
      {screen === "start" && <StartScreen onStart={handleStart} />}

      {screen === "intro" && <IntroScreen onFinish={handleIntroEnd} />} 
      {/* 인트로 끝나면 자동으로 handleIntroEnd() 호출 */}

      {screen === "stage" && (
        <div className={rootClass}>
          <StageLayout>{stageMap[stage]}</StageLayout>
        </div>
      )}
    </>
  );
}
