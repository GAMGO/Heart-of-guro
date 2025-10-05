import React, { useEffect, useState, useRef } from "react";
import nblBackground from "/nbl.png";
import "../styles/NblScreen.css";

export default function NblScreen({ onFinish }) {
  const [text, setText] = useState("");
  const [showNext, setShowNext] = useState(false);
  const hasRun = useRef(false); 
  const message = "This is just the start — I will make it happen!!";

  useEffect(() => {
    if (hasRun.current) return; 
    hasRun.current = true;

    let index = 0;

    const type = () => {
      setText((prev) => prev + message.charAt(index));
      index++;

      if (index < message.length) {
        setTimeout(type, 70);
      } else {
        setTimeout(() => setShowNext(true), 1500);
      }
    };

    type();
  }, []);

  return (
    <div
      className="nbl-screen"
      style={{
        backgroundImage: `url(${nblBackground})`,
      }}
    >
      <div className="dialogue">
        <p className="dialogue-name">Buzz Joe</p>
        <p className="dialogue-text">{text}</p>
      </div>

      {showNext && (
        <button className="next-button" onClick={onFinish}>
          NEXT
        </button>
      )}
    </div>
  );
}
