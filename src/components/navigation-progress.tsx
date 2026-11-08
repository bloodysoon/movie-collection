"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const BASE = "pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[2px] origin-left bg-gradient-to-r from-[#74603D] via-[#B49A70] to-[#D4BA8D]";

export function NavigationProgress() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const barRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Detect navigation start via link clicks — no setState, safe from any context
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || anchor.target === "_blank") return;

      clearTimeout(hideTimer.current);
      const bar = barRef.current;
      if (!bar) return;
      bar.className = `${BASE} animate-nav-loading`;
      bar.style.display = "block";
    };
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      clearTimeout(hideTimer.current);
    };
  }, []);

  // Detect navigation completion
  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    clearTimeout(hideTimer.current);
    const bar = barRef.current;
    if (!bar) return;
    bar.className = `${BASE} animate-nav-complete`;
    bar.style.display = "block";

    hideTimer.current = setTimeout(() => {
      if (barRef.current) barRef.current.style.display = "none";
    }, 500);
  }, [pathname]);

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      style={{ display: "none" }}
      className={BASE}
    />
  );
}
