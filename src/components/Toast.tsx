"use client";

import { useEffect } from "react";

type Props = {
  message: string;
  onClose: () => void;
  duration?: number;
};

export default function Toast({ message, onClose, duration = 2200 }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-white text-black text-sm font-medium px-4 py-2.5 rounded-full shadow-lg pointer-events-none">
      {message}
    </div>
  );
}
