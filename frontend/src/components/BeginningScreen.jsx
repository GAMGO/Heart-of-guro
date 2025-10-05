import React, { useEffect, useState } from "react";
import "../styles/BeginningScreen.css";

export default function BeginningScreen({ onFinish }) {
  const [showNewspaper, setShowNewspaper] = useState(false); 
  const [fadeBright, setFadeBright] = useState(false);       
  const [showNext, setShowNext] = useState(false);           

  useEffect(() => {
    const timers = [];

    timers.push(setTimeout(() => setShowNewspaper(true), 1000));

    timers.push(setTimeout(() => setFadeBright(true), 2000));

    timers.push(setTimeout(() => setShowNext(true), 4500));

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="beginning-container">
      <img src="/back.png" alt="background" className="background" />

      {showNewspaper && (
        <img
          src="/newspaper.png"
          alt="newspaper"
          className={`newspaper ${fadeBright ? "fade-in" : ""}`}
        />
      )}

      {showNext && (
        <button className="next-button fade-up" onClick={onFinish}>
          Let's go challange!
        </button>
      )}
    </div>
  );
}
