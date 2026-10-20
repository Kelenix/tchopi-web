"use client";

import { useEffect, useRef } from "react";

/** Braises qui montent du grill (canvas léger, en pause hors écran, absent si le mouvement réduit est demandé). */
export function Embers({ count = 70 }: { count?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = el.getContext("2d")!;
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const resize = () => {
      width = el.clientWidth;
      height = el.clientHeight;
      el.width = width * dpr;
      el.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const spawn = (anywhere: boolean) => ({
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : height + 10,
      r: 0.6 + Math.random() * 2.2,
      vy: 0.35 + Math.random() * 1.1,
      vx: (Math.random() - 0.5) * 0.4,
      life: 0.4 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
    });
    resize();
    const sparks = Array.from({ length: count }, () => spawn(true));
    const observer = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    observer.observe(el);
    addEventListener("resize", resize);

    const draw = (t: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible) return;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      for (const s of sparks) {
        s.y -= s.vy;
        s.x += s.vx + Math.sin(t / 900 + s.phase) * 0.25;
        const fade = Math.max(0, Math.min(1, s.y / height)) * s.life;
        if (s.y < -10) Object.assign(s, spawn(false));
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
        g.addColorStop(0, `rgba(255, 196, 120, ${fade})`);
        g.addColorStop(0.4, `rgba(255, 120, 40, ${fade * 0.6})`);
        g.addColorStop(1, "rgba(255, 80, 20, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      removeEventListener("resize", resize);
    };
  }, [count]);

  return <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 size-full" />;
}
