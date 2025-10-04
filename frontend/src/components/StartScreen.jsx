import React, { useState } from "react";

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
      style={{
        marginRight: 8,
        padding: "8px 12px",
        background: selected === v ? "#eee" : "#fff",
        border: "1px solid #ccc",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ padding: 16 }}>
      <h1>메인 스타트</h1>
      <div style={{ marginBottom: 16 }}>
        {btn("stage1", "스테이지 1")}
        {btn("stage2", "스테이지 2")}
        {btn("stage3", "스테이지 3")}
        {btn("cupola", "큐폴라")}
      </div>

      <button onClick={() => onStart(selected)} style={{ padding: "10px 16px" }}>
        Start
      </button>
    </div>
  );
}
