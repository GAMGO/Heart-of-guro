import React from "react";
import "../styles/StartScreen.css";

export default function StartScreen({ onStart }) {
  return (
    <div className="start-screen">
      <button className="start-btn" onClick={() => onStart()}>
        Start
      </button>
      <div className="acrostic">
        <p><b>N</b>ASA</p>
        <p><b>A</b>nniversary</p>
        <p><b>S</b>tories</p>
        <p><b>A</b>pp</p>
      </div>
      <img src="/logo.png" alt="NASA Logo" className="logo" />
    </div>
  );
}
