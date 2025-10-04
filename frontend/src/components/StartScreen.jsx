import React, { useState, useEffect } from "react";
import "../styles/StartScreen.css";
import Cupola from "./stages/Cupola";
import Stage1 from "./stages/Stage1";

export default function StartScreen({ onStart }) {
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

    const typeNextChar = () => {
      if (lineIndex >= lines.length) return;

      const { bold, text } = lines[lineIndex];

      if (charIndex === 0) {
        // 첫 글자 표시
        setDisplayedLines((prev) => {
          const updated = [...prev];
          updated[lineIndex] = `<b>${bold}</b>`;
          return updated;
        });
        charIndex++;
        setTimeout(typeNextChar, 250); // 첫글자 후 잠시 멈춤
      } else if (charIndex <= text.length) {
        // 글자 하나씩 추가
        setDisplayedLines((prev) => {
          const updated = [...prev];
          updated[lineIndex] = `<b>${bold}</b>` + text.slice(0, charIndex);
          return updated;
        });
        charIndex++;
        setTimeout(typeNextChar, 70); // 글자 간속도
      } else {
        // 다음 줄로 이동
        lineIndex++;
        charIndex = 0;
        setTimeout(typeNextChar, 200); // 줄 간격 대기
      }
    };

    typeNextChar();
  }, []);

  return (
    <div className="start-screen">
      <button className="start-btn" onClick={() => onStart()}>
        START
      </button>
      <div className="">
        <button onClick={() => onStart("stage1")}>Stage1</button>
        <button onClick={() => onStart("stage2")}>Stage2</button>
        <button onClick={() => onStart("stage3")}>Stage3</button>
        <button onClick={() => onStart("Cupola")}>Cupola</button>
      </div>

      <div className="acrostic">
        <p>
          <b>N</b>ASA
        </p>
        <p>
          <b>A</b>nniversary
        </p>
        <p>
          <b>S</b>tories
        </p>
        <p>
          <b>A</b>pp
        </p>
      </div>
      <img src="/logo.png" alt="NASA Logo" className="logo" />
    </div>
  );
}
