import React, { useState } from "react";
import StartScreen from "./components/StartScreen.jsx";
import IntroScreen from "./components/IntroScreen.jsx";
import BeginningScreen from "./components/BeginningScreen.jsx";
import Stage1 from "./components/stages/Stage1.jsx";
import Stage2 from "./components/stages/Stage2.jsx";
import Stage3 from "./components/stages/Stage3.jsx";
import Cupola from "./components/stages/Cupola.jsx";
import MonologueBuzz from "./components/stages/MonologueBuzz.jsx";

export default function App() {
  const [scene, setScene] = useState("splash"); // 현재 장면
  const [stage, setStage] = useState("stage1"); // 현재 스테이지
  const rootClass = scene === "stage" ? "stage-root" : "";

  // 스테이지 렌더링 스위치
  const renderStage = () => {
    switch (stage) {
      case "stage1":
        return <Stage1 onDone={() => setStage("stage2")} />;
      case "stage2":
        return <Stage2 onComplete={() => setStage("stage3")} />;
      case "stage3":
        return <Stage3 onEnter={() => setStage("buzz")} />;
      case "buzz":
        return <MonologueBuzz onDone={() => setStage("cupola")} />;
      case "cupola":
        return <Cupola />;
      default:
        return null;
    }
  };

  return (
    <div className={rootClass}>
      {/* 🎬 1️⃣ 시작 화면 */}
      {scene === "splash" && (
        <StartScreen
          onStart={(selected) => {
            setStage(selected || "stage1");
            setScene("intro"); // ✅ Start 후 인트로로 이동
          }}
          onJump={(s) => {
            setStage(s);
            setScene("stage");
          }}
        />
      )}

      {/* 🧍‍♂️ 2️⃣ IntroScreen (Buzz Joe의 독백 인트로) */}
      {scene === "intro" && (
        <IntroScreen onFinish={() => setScene("beginning")} /> // ✅ 인트로 끝나면 Beginning으로
      )}

      {/* 📰 3️⃣ BeginningScreen (신문 등장 씬) */}
      {scene === "beginning" && (
        <BeginningScreen onFinish={() => setScene("stage")} /> // ✅ 신문 끝나면 Stage 시작
      )}

      {/* 🚀 4️⃣ Stage 화면 */}
      {scene === "stage" && renderStage()}
    </div>
  );
}
