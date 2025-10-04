import React from "react";
import "../styles/StartScreen.css";
export default function StartScreen({ onStart }) {
  return (
    <div className="start-screen">
      <button className="start-btn" onClick={() => onStart()}>
        Start
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
