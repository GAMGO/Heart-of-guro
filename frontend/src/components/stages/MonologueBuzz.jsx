import React, { useEffect, useRef, useState } from "react";

export default function MonologueBuzz({ onDone, duration = 8000 }) {
  const [phase, setPhase] = useState(0);
  const timer = useRef(null);
  const skip = () => {
    if (timer.current) clearTimeout(timer.current);
    onDone && onDone();
  };
  useEffect(() => {
    const onKey = () => skip();
    const onClick = () => skip();
    window.addEventListener("keydown", onKey, { once: true });
    window.addEventListener("mousedown", onClick, { once: true });
    timer.current = setTimeout(() => setPhase(1), 2200);
    const t2 = setTimeout(() => setPhase(2), 4600);
    const t3 = setTimeout(() => skip(), duration);
    return () => {
      clearTimeout(timer.current);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("keydown", onKey, { once: true });
      window.removeEventListener("mousedown", onClick, { once: true });
    };
  }, [onDone, duration]);
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        color: "#e8eaed",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple SD Gothic Neo, Noto Sans, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 960,
          width: "90%",
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        <div
          style={{
            fontSize: 22,
            opacity: phase >= 0 ? 1 : 0,
            transition: "opacity 600ms ease",
          }}
        >
          Buzz Joe: “It’s over... I breathe out, and my visor clouds for a moment.”
        </div>
        <div style={{ height: 16 }} />
        <div
          style={{
            fontSize: 22,
            opacity: phase >= 1 ? 1 : 0,
            transition: "opacity 600ms ease",
          }}
        >
          “It’s quiet... like the whole universe is holding its breath.”
        </div>
        <div style={{ height: 16 }} />
        <div
          style={{
            fontSize: 22,
            opacity: phase >= 2 ? 1 : 0,
            transition: "opacity 600ms ease",
          }}
        >
          “A small door behind me, and the whole universe ahead. Cupola — I’m
          coming.”
        </div>

        <div style={{ marginTop: 28, fontSize: 14, opacity: 0.7 }}>
          Press any key or click to continue
        </div>
      </div>
    </div>
  );
}
