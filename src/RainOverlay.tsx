import React, { useEffect, useState } from "react";

interface Drop {
  id: number;
  x: number;
  delay: number;
  duration: number;
  height: number;
  opacity: number;
}

export default function RainOverlay({ active }: { active: boolean }) {
  const [drops, setDrops] = useState<Drop[]>([]);

  useEffect(() => {
    if (!active) { setDrops([]); return; }

    const generated: Drop[] = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 0.6 + Math.random() * 0.6,
      height: 12 + Math.random() * 20,
      opacity: 0.4 + Math.random() * 0.5,
    }));
    setDrops(generated);
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden" style={{ background: "rgba(30, 30, 40, 0.55)" }}>
      <style>{`
        @keyframes rain-fall {
          0% { transform: translateY(-40px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(110vh); opacity: 0; }
        }
      `}</style>
      {drops.map((drop) => (
        <div
          key={drop.id}
          style={{
            position: "absolute",
            left: `${drop.x}%`,
            top: 0,
            width: "2px",
            height: `${drop.height}px`,
            background: `linear-gradient(to bottom, transparent, rgba(100, 149, 200, ${drop.opacity}))`,
            borderRadius: "0 0 2px 2px",
            animation: `rain-fall ${drop.duration}s ${drop.delay}s infinite linear`,
          }}
        />
      ))}
    </div>
  );
}
