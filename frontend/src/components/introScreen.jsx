import React, { useEffect, useState } from "react";
import "../styles/IntroScreen.css";

const MONOLOGUE = [
  "하.........",
  "나도...... ",
  "어딘가에 쓰이고 싶다......"
];

export default function IntroScreen({ onFinish }) {
  const [step, setStep] = useState(0);
  const [dialogue, setDialogue] = useState("");

  useEffect(() => {
    const timers = [];

    // 1️⃣ 2초 후 첫 대사
    timers.push(setTimeout(() => { setStep(1); setDialogue(MONOLOGUE[0]); }, 2000));

    // 2️⃣ buzz_joe 줌인
    timers.push(setTimeout(() => { setStep(2); setDialogue(MONOLOGUE[1]); }, 4000));

    // 3️⃣ 다음 대사
    timers.push(setTimeout(() => { setDialogue(MONOLOGUE[2]); }, 5500));

    // 4️⃣ back.png + blow 날아오기
    timers.push(setTimeout(() => { setStep(3); setDialogue(""); }, 7500));

    // 5️⃣ joe_blow + "앗..."
    timers.push(setTimeout(() => { setStep(4); setDialogue("앗...........!!!!!"); }, 9000));

    // 6️⃣ 인트로 종료 후 다음 화면으로 (2초 후)
    timers.push(setTimeout(() => { onFinish && onFinish(); }, 11000));

    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  return (
    <div className="intro-container">
      {step === 0 && <img src="/intro.png" alt="intro" className="intro" />}
      {step >= 1 && <div className="dialogue fade-in"><p>{dialogue}</p></div>}
      {step >= 2 && step < 3 && <img src="/buzz_joe.png" alt="joe" className="buzz_joe zoom-in" />}
      {step === 3 && (
        <>
          <img src="/back.png" alt="back" className="back" />
          <img src="/blow.png" alt="blow" className="blow move-left-to-right" />
        </>
      )}
      {step === 4 && (
        <>
          <img src="/joe_blow.png" alt="joe surprised" className="joe zoom-in" />
          <div className="dialogue fade-in"><p>{dialogue}</p></div>
        </>
      )}
    </div>
  );
}
