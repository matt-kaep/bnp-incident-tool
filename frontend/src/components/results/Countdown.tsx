import { useEffect, useState } from "react";

interface Props {
  detectionDatetime: string;
  firstDeadlineHours: number | null;
}

export default function Countdown({ detectionDatetime, firstDeadlineHours }: Props) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!firstDeadlineHours) return;
    const deadline = new Date(detectionDatetime);
    deadline.setHours(deadline.getHours() + firstDeadlineHours);

    const update = () => {
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();
      if (diff <= 0) {
        setRemaining("DÉLAI DÉPASSÉ");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}min`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [detectionDatetime, firstDeadlineHours]);

  if (!firstDeadlineHours) return null;

  return (
    <div className="text-sm font-mono">
      <span className="text-white/70">Première deadline dans : </span>
      <span className="font-bold text-yellow-300">{remaining}</span>
    </div>
  );
}
