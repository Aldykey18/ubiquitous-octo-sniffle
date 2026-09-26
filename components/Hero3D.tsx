"use client";

// ============================================================
// HERO 3D — canvas de particules + orbe + cartes flottantes en
// perspective avec parallaxe souris. Zéro dépendance externe.
// ============================================================

import { useEffect, useRef, useState } from "react";

export function Hero3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Champ de particules connectées
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0, h = 0;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const COLORS = ["61,123,255", "139,92,246", "34,211,238"];

    type P = { x: number; y: number; vx: number; vy: number; r: number; c: string };
    let particles: P[] = [];

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * DPR; canvas.height = h * DPR;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const count = Math.min(70, Math.floor((w * h) / 16000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.9 + 0.6,
        c: COLORS[Math.floor(Math.random() * COLORS.length)]
      }));
    };

    const step = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; if (p.y > h + 10) p.y = -10;
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) {
            const alpha = (1 - Math.sqrt(d2) / 120) * 0.16;
            ctx.strokeStyle = `rgba(${a.c},${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const p of particles) {
        ctx.fillStyle = `rgba(${p.c},.75)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(step);
    };

    resize();
    step();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  // Parallaxe 3D des cartes flottantes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const onMove = (e: MouseEvent) => {
      const rect = scene.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      scene.querySelectorAll<HTMLElement>("[data-depth]").forEach(el => {
        const depth = Number(el.dataset.depth || 1);
        el.style.transform = `rotateY(${x * 10 * depth}deg) rotateX(${-y * 10 * depth}deg) translateY(${y * -6 * depth}px)`;
      });
    };
    const onLeave = () => {
      scene.querySelectorAll<HTMLElement>("[data-depth]").forEach(el => {
        el.style.transform = "";
      });
    };
    scene.addEventListener("mousemove", onMove);
    scene.addEventListener("mouseleave", onLeave);
    return () => { scene.removeEventListener("mousemove", onMove); scene.removeEventListener("mouseleave", onLeave); };
  }, []);

  if (!mounted) return <div className="h-[420px]" />;

  return (
    <div className="relative" style={{ perspective: "1200px" }} ref={sceneRef}>
      <canvas ref={canvasRef} className="absolute inset-0 -z-10" aria-hidden />

      <div className="relative mx-auto flex min-h-[420px] max-w-3xl flex-col items-center justify-center text-center">
        {/* Orbe centrale */}
        <div className="pointer-events-none absolute inset-0 -z-10 grid place-items-center opacity-60" aria-hidden>
          <div className="orb scale-[.8]" style={{ transformStyle: "preserve-3d" }}>
            <div className="orb-ring" />
            <div className="orb-ring orb-ring-2" />
          </div>
        </div>

        <div className="fade-up inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-bold tracking-[0.2em]"
          style={{ borderColor: "var(--border-strong)", background: "rgba(61,123,255,.08)", color: "#8fb4ff" }}>
          <span className="dot-live" style={{ width: 7, height: 7 }} /> MOTEUR IA MULTI-MODÈLES · TEMPS RÉEL
        </div>

        <h1 className="font-display fade-up mt-5 text-4xl font-bold leading-[1.05] sm:text-6xl" style={{ animationDelay: ".1s" }}>
          THE INTELLIGENCE
          <br />
          <span className="text-gradient">BEHIND THE BEST PICKS</span>
        </h1>

        <p className="fade-up mt-4 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base" style={{ animationDelay: ".2s" }}>
          Analyse multidimensionnelle des événements sportifs — probabilités, value bets,
          consensus de 5 moteurs IA. <b className="text-slate-200">Qualité &gt; quantité</b> : uniquement les
          meilleures prédictions du jour, ou <b className="text-slate-200">NO BET</b>.
        </p>

        <div className="fade-up mt-7 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: ".3s" }}>
          <a href="/predictions" className="btn-primary text-sm">🔥 VOIR LES MEILLEURES PRÉDICTIONS</a>
          <a href="/backtest" className="btn-ghost text-sm">🧪 Résultats du backtest</a>
        </div>

        {/* Cartes flottantes 3D */}
        <div className="pointer-events-none absolute -left-6 top-6 hidden lg:block" data-depth="1.6">
          <FloatCard>
            <div className="text-[9px] font-bold tracking-widest text-slate-500">MODEL PROBABILITY</div>
            <div className="font-display text-xl font-bold text-cyan-300">72 %</div>
            <div className="track mt-1.5 w-28"><span className="bar-blue" style={{ width: "72%" }} /></div>
          </FloatCard>
        </div>
        <div className="pointer-events-none absolute -right-8 top-16 hidden lg:block" data-depth="2.1">
          <FloatCard>
            <div className="text-[9px] font-bold tracking-widest text-slate-500">VALUE DETECTED</div>
            <div className="font-display text-xl font-bold text-emerald-400">+26.0 %</div>
            <div className="text-[9px] text-slate-500">EV · odds 1.75 vs 54 %</div>
          </FloatCard>
        </div>
        <div className="pointer-events-none absolute -bottom-2 left-10 hidden lg:block" data-depth="1.2">
          <FloatCard>
            <div className="text-[9px] font-bold tracking-widest text-slate-500">CONFIDENCE</div>
            <div className="font-display text-xl font-bold text-amber-300">92<span className="text-xs text-slate-500">/100</span></div>
            <div className="text-[9px] font-bold text-amber-400">👑 PREMIUM</div>
          </FloatCard>
        </div>
        <div className="pointer-events-none absolute -bottom-4 right-6 hidden lg:block" data-depth="1.8">
          <FloatCard>
            <div className="text-[9px] font-bold tracking-widest text-slate-500">AI CONSENSUS</div>
            <div className="font-display text-xl font-bold text-violet-400">5<span className="text-xs text-slate-500">/5</span></div>
            <div className="text-[9px] text-slate-500">modèles alignés</div>
          </FloatCard>
        </div>
      </div>
    </div>
  );
}

function FloatCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass float-card animate-float rounded-2xl px-4 py-3 shadow-glow-blue" style={{ minWidth: 130 }}>
      {children}
    </div>
  );
}
