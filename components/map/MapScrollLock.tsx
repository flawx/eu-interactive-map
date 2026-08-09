"use client";

import { useEffect } from "react";

/** Apply map-lock class so only the map route freezes document scroll. */
export function MapScrollLock() {
  useEffect(() => {
    document.documentElement.classList.add("map-lock");
    return () => {
      document.documentElement.classList.remove("map-lock");
    };
  }, []);
  return null;
}
