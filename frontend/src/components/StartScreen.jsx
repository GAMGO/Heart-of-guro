import React, { useState, useEffect } from "react";
import "../styles/StartScreen.css";

export default function StartScreen({ onStart, onJump }) {
  // 타이핑 애니메이션용 문구
  const lines = [
    { bold: "N", text: "ASA" },
    { bold: "A", text: "nniversary" },
    { bold: "S", text: "tories" },
    { bold: "A", text: "pp" },
  ];

  const [displayedLines, setDisplayedLines] = useState(["", "", "", ""]);

  useEffect(() => {
    let lineIndex = 0;
    let charIndex = 0;

    // 한 글자씩 타이핑하는 애니메이션 함수
    const typeNextChar = () => {
      if (lineIndex >= lines.length) return;
      const { bold, text } = lines[lineIndex];
      if (charIndex === 0) {
        // 첫 글자(bold) 출력
        setDisplayedLines((prev) => {
          const updated = [...prev];
          updated[lineIndex] = `<b>${bold}</b>`;
          return updated;
        });
        charIndex++;
        setTimeout(typeNextChar, 250);
      } else if (charIndex <= text.length) {
        // 나머지 글자 하나씩 추가
        setDisplayedLines((prev) => {
          const updated = [...prev];
          updated[lineIndex] = `<b>${bold}</b>` + text.slice(0, charIndex);
          return updated;
        });
        charIndex++;
        setTimeout(typeNextChar, 70);
      } else {
        // 다음 줄로 이동
        lineIndex++;
        charIndex = 0;
        setTimeout(typeNextChar, 200);
      }
    };

    typeNextChar();
  }, []);

  return (
    <div className="start-screen">
      {/* 메인 START 버튼 (인트로로 이동) */}
      <button className="start-btn" onClick={() => onStart("stage1")}>
        START
      </button>

      {/* 디버그/테스트용 스테이지 바로가기 버튼 */}
      <div className="stage-shortcuts">
        <button onClick={() => onJump("stage1")}>Stage1</button>
        <button onClick={() => onJump("stage2")}>Stage2</button>
        <button onClick={() => onJump("stage3")}>Stage3</button>
        <button onClick={() => onJump("cupola")}>Cupola</button>
      </div>

      {/* NASA Acronym 애니메이션 텍스트 */}
      <div className="acrostic">
        {displayedLines.map((html, i) => (
          <p key={i} dangerouslySetInnerHTML={{ __html: html }} />
        ))}
      </div>

      {/* 로고 이미지 */}
      <img src="/logo.png" alt="NASA Logo" className="logo" />
    </div>
  );
}
