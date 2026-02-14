'use client';

import { useEffect, useRef } from 'react';

export default function InteractiveBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let particles: any[] = [];
        let animationFrameId: number;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        const initParticles = () => {
            particles = [];
            // Create more particles for a denser starfield effect
            const particleCount = Math.floor(window.innerWidth / 8);

            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.15, // Slower, more majestic movement
                    vy: (Math.random() - 0.5) * 0.15,
                    size: Math.random() * 1.5 + 0.1, // Smaller, star-like
                    alpha: Math.random() * 0.5 + 0.1,
                    type: Math.random() > 0.9 ? 'star' : 'particle' // Some bright stars
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw particles
            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around edges seamlessly
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

                if (p.type === 'star') {
                    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.5})`; // Twinkling
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = "white";
                } else {
                    ctx.fillStyle = `rgba(165, 180, 252, ${p.alpha})`; // Indigo-200
                    ctx.shadowBlur = 0;
                }

                ctx.fill();

                // Connect particles if close (Nebula network)
                // Reduced connection distance for cleaner look
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(99, 102, 241, ${0.08 * (1 - dist / 100)})`; // Very subtle indigo
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        window.addEventListener('resize', resize);
        resize();
        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-[#0f1020]">
            {/* Rich CSS Gradient Background Layers */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(49,46,129,0.4)_0%,transparent_50%)]" /> {/* Indigo top-left */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(88,28,135,0.4)_0%,transparent_50%)]" /> {/* Purple bottom-right */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,0)_0%,rgba(0,0,0,0.6)_100%)]" /> {/* Vignette */}

            {/* Animated Orbs/Glows */}
            <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse-slow mix-blend-screen pointer-events-none" />
            <div className="absolute bottom-[20%] right-[20%] w-[500px] h-[500px] bg-violet-900/20 rounded-full blur-[120px] animate-pulse-slower mix-blend-screen pointer-events-none" />

            {/* Particle Canvas Overlay */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-10"
            />
        </div>
    );
}
