import React, { useEffect, useState } from "react";
import "../styles/BeginningScreen.css";

export default function BeginningScreen({ onFinish }) {
  const [showNewspaper, setShowNewspaper] = useState(false); // 신문 등장 제어
  const [fadeBright, setFadeBright] = useState(false);       // 밝아짐 제어
  const [showNext, setShowNext] = useState(false);           // Next 버튼 표시 제어

  useEffect(() => {
    const timers = [];

    // 📰 1️⃣ 신문 등장
    timers.push(setTimeout(() => setShowNewspaper(true), 1000));

    // ☀️ 2️⃣ 신문 밝아지기 시작
    timers.push(setTimeout(() => setFadeBright(true), 2000));

    // ⏳ 3️⃣ 밝아진 후 2.5초 뒤 Next 버튼 표시
    timers.push(setTimeout(() => setShowNext(true), 4500));

    // ❌ 자동 전환은 제거! (onFinish 실행 없음)
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="beginning-container">
      {/* 어두운 배경 */}
      <img src="/back.png" alt="background" className="background" />

      {/* 신문 이미지 */}
      {showNewspaper && (
        <img
          src="/newspaper.png"
          alt="newspaper"
          className={`newspaper ${fadeBright ? "fade-in" : ""}`}
        />
      )}

      {/* 버튼 — 직접 눌러야 전환 */}
      {showNext && (
        <button className="next-button fade-up" onClick={onFinish}>
          Let's go challange!
        </button>
      )}
    </div>
  );
}
