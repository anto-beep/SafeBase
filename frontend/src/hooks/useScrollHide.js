import { useEffect, useState } from "react";

/**
 * useScrollHide — returns `true` when the user is actively scrolling DOWN (so
 * floating widgets should hide), and `false` when scrolling up or near the top.
 * 12px threshold prevents jitter on inertial scroll.
 */
export default function useScrollHide() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const diff = y - lastY;
        if (y < 60) {
          setHidden(false);
        } else if (diff > 12) {
          setHidden(true);
        } else if (diff < -12) {
          setHidden(false);
        }
        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return hidden;
}
