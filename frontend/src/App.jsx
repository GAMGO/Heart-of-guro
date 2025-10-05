import React, { useState } from "react";
import StartScreen from "./components/StartScreen.jsx";
import IntroScreen from "./components/introScreen.jsx";
import Stage1 from "./components/stages/Stage1.jsx";
import Stage2 from "./components/stages/Stage2.jsx";
import Stage3 from "./components/stages/Stage3.jsx";
import Cupola from "./components/stages/Cupola.jsx";
import MonologueBuzz from "./components/stages/MonologueBuzz.jsx";

export default function App() {
  const [scene, setScene] = useState("splash");
  const [stage, setStage] = useState("stage1");
  const rootClass = scene === "stage" ? "stage-root" : "";


  return (
    <div className={rootClass}>
      {scene === "splash" && (
        <StartScreen
          onStart={(selected) => {
            setStage(selected || "stage1");
            setScene("intro");
          }}
          onJump={(s) => {
            setStage(s);
            setScene("stage");
          }}
        />
      )}
      {scene === "intro" && <IntroScreen onFinish={() => setScene("stage")} />}
      {scene === "stage" && renderStage()}
    </div>
  );
}
