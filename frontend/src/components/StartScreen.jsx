import React, { useState } from "react";
import "../styles/StartScreen.css";

export default function StartScreen({ onStart }) {
  const [selected, setSelected] = useState("stage1");

  const go = (v) => {
    setSelected(v);
    onStart(v);
  };

  const btn = (v, label) => (
    <button
      key={v}
      onClick={() => go(v)}
      className={`stage-btn ${selected === v ? "active" : ""}`}
    >
      {label}
    </button>
  );

  return (
    <div className="start-screen">
      {/* 중앙의 타이틀 */}
      <h1 className="title"></h1>

      {/* 중앙의 스테이지 버튼들 */}
      <div className="stage-buttons">
        {btn("stage1", "스테이지 1")}
        {btn("stage2", "스테이지 2")}
        {btn("stage3", "스테이지 3")}
        {btn("cupola", "큐폴라")}
      </div>

      {/* 중앙의 Start 버튼 */}
      <button className="start-btn" onClick={() => onStart(selected)}>
        Start
      </button>

      {/* NASA 사행시 */}
      <div className="acrostic">
        <p><b>N</b>ASA</p>
        <p><b>A</b>nniversary</p>
        <p><b>S</b>tories</p>
        <p><b>A</b>pp</p>
      </div>

      {/* 우측 하단의 로고 */}
      <img src="/logo.png" alt="NASA Logo" className="logo" />
    </div>
  );
}
 