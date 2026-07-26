"use client";

import { useEffect, useState, type RefObject } from "react";

export type AnchoredRect = {
  top: number;
  left: number;
  width: number;
  right: number;
  bottom: number;
};

/**
 * Tracks an anchor element's viewport box for fixed portal menus.
 * Updates on resize, orientation change, and scroll.
 */
export function useAnchoredPortalRect(
  anchorRef: RefObject<HTMLElement | null>,
  active: boolean,
): AnchoredRect | null {
  const [rect, setRect] = useState<AnchoredRect | null>(null);

  useEffect(() => {
    if (!active) {
      setRect(null);
      return;
    }

    const update = () => {
      const element = anchorRef.current;
      if (!element) return;
      const box = element.getBoundingClientRect();
      setRect({
        top: box.top,
        left: box.left,
        width: box.width,
        right: box.right,
        bottom: box.bottom,
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, anchorRef]);

  return rect;
}
