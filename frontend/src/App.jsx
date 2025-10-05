import React, { useState } from "react";
import StartScreen from "./components/StartScreen.jsx";
import IntroScreen from "./components/introScreen.jsx";
import Stage from "./components/stages/Stage.jsx";
import Cupola from "./components/stages/Cupola.jsx";

export default function App() {
  const [scene, setScene] = useState("splash");
  const [stage, setStage] = useState("stage");
  const rootClass = scene === "stage" ? "stage-root" : "";

  const renderStage = () => {
    switch (stage) {
      case "stage":
        return <Stage />;
      case "cupola":
        return <Cupola />;
      default:
        return null;
    }
  };

  return (
    <div className={rootClass}>
      {scene === "splash" && (
        <StartScreen
          onStart={(selected) => {
            setStage(selected || "stage");
            setScene("intro");
          }}
          onJump={(s) => {
            setStage(s);
            setScene("stage");
          }}
        />
      )}
      {scene === "intro" && (
        <IntroScreen
          onFinish={() => {
            setScene("stage");
          }}
        />
      )}
      {scene === "stage" && renderStage()}
    </div>
  );
}
