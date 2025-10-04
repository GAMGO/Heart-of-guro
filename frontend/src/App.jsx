import React, { useState } from "react";
import StartScreen from "./components/StartScreen.jsx";
import StageLayout from "./components/StageLayout.jsx";
import Stage1 from "./components/stages/Stage1.jsx";
import Stage2 from "./components/stages/Stage2.jsx";
import Stage3 from "./components/stages/Stage3.jsx";
import Cupola from "./components/stages/Cupola.jsx";

export default function App() {
  const [screen, setScreen] = useState("intro");
  const [stage, setStage] = useState("stage1");

  const handleStart = (selected) => {
    setStage(selected);
    setScreen("stage");
  };

  const handleBack = () => setScreen("intro");

  if (screen === "intro") return <StartScreen onStart={handleStart} />;

  const stageMap = {
    stage1: <Stage1 />,
    stage2: <Stage2 />,
    stage3: <Stage3 />,
    cupola: <Cupola />,
  };

  const rootClass = stage === "stage3" ? "stage-stage3" : "";

  return (
    <div className={rootClass}>
      <StageLayout current={stage} onChangeStage={setStage} onBack={handleBack}>
        {stageMap[stage]}
      </StageLayout>
    </div>
  );
}
