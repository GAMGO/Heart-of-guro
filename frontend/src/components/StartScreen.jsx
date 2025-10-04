import React, { useState } from "react";
import "../styles/StartScreen.css";

export default function StartScreen({ onStart }) {

  return (
    <div className="start-screen">
 
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
 