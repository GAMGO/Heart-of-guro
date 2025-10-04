import React from "react";

export default function StageLayout({ current, onChangeStage, onBack, children }) {
  const Tab = ({ id, label }) => (
    <button
      onClick={() => onChangeStage(id)}
      style={{
        marginRight: 8,
        padding: "6px 10px",
        border: "1px solid #ccc",
        background: current === id ? "#eee" : "#fff",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <Tab id="stage1" label="스테이지 1" />
        <Tab id="stage2" label="스테이지 2" />
        <Tab id="stage3" label="스테이지 3" />
        <Tab id="cupola" label="큐폴라" />
        <button onClick={onBack} style={{ marginLeft: 16, padding: "6px 10px" }}>
          ← 메인으로
        </button>
      </div>
      <div>{children}</div>
    </div>
  );
}
