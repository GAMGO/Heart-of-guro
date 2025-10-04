import React from "react";
import "./StageLayout.css";

export default function StageLayout({ current, onChangeStage, onBack, children }) {
  const Tab = ({ id, label }) => (
    <button onClick={() => onChangeStage(id)} className={`stage-tab ${current === id ? "active" : ""}`}>
      {label}
    </button>
  );
  return (
    <div className="app">
      <div className="stage-header">
        <Tab id="stage1" label="스테이지 1" />
        <Tab id="stage2" label="스테이지 2" />
        <Tab id="stage3" label="스테이지 3" />
        <Tab id="cupola" label="큐폴라" />
        <button onClick={onBack} className="stage-back">← 메인으로</button>
      </div>
      <div className="stage-content">{children}</div>
    </div>
  );
}
