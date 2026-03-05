/* ============================================================
   AirNet — Homepage JS
   Handles: entrance animations · grain · scroll parallax · CTA transition
   ============================================================ */

(function () {
    'use strict';

    /* ── Grain canvas ─────────────────────────────────────── */
    /* ── Grain canvas (Optimized) ────────────────────────── */
    (function initGrain() {
        const canvas = document.getElementById('grainCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Performance fix: Use a small offscreen pattern instead of per-pixel full-res compute
        const patternSize = 128;
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = patternCanvas.height = patternSize;
        const pCtx = patternCanvas.getContext('2d');

        function updatePattern() {
            const imgData = pCtx.createImageData(patternSize, patternSize);
            for (let i = 0; i < imgData.data.length; i += 4) {
                const v = Math.random() * 255;
                imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = v;
                imgData.data[i + 3] = 25; // Subtle opacity
            }
            pCtx.putImageData(imgData, 0, 0);
        }

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        let lastTime = 0;
        function renderGrain(time) {
            // Performance fix: Limit grain FPS to 24fps
            if (time - lastTime < 41) {
                requestAnimationFrame(renderGrain);
                return;
            }
            lastTime = time;

            updatePattern();
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Fill with pattern
            const ptrn = ctx.createPattern(patternCanvas, 'repeat');
            ctx.fillStyle = ptrn;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            requestAnimationFrame(renderGrain);
        }

        window.addEventListener('resize', resize);
        resize();
        requestAnimationFrame(renderGrain);
    })();


    /* ── Entrance reveal ──────────────────────────────────── */
    (function initEntrance() {
        const header = document.getElementById('siteHeader');
        const liveChip = document.getElementById('liveChip');
        const line1 = document.querySelector('.line-1');
        const line2 = document.querySelector('.line-2');
        const heroSub = document.getElementById('heroSub');
        const ctaWrap = document.getElementById('ctaWrap');
        const strip = document.getElementById('dataStrip');

        // The CSS transitions handle the stagger timing via transition-delay.
        // We just add .visible after a single rAF to trigger them.
        requestAnimationFrame(() => {
            setTimeout(() => {
                header && header.classList.add('visible');
                liveChip && liveChip.classList.add('visible');
                line1 && line1.classList.add('visible');
                line2 && line2.classList.add('visible');
                heroSub && heroSub.classList.add('visible');
                ctaWrap && ctaWrap.classList.add('visible');
                strip && strip.classList.add('visible');
            }, 80);
        });
    })();


    /* ── Scroll-reactive parallax hints ──────────────────── */
    (function initScrollHints() {
        const splineWrap = document.getElementById('splineWrap');
        const heroContent = document.getElementById('heroContent');
        const scrollHint = document.getElementById('scrollHint');
        let ticking = false;
        let lastY = 0;
        const maxScroll = 320; // pixels before transition fires

        // Temporarily unlock body scroll to detect it
        document.body.style.overflow = 'hidden';

        // We capture wheel events instead to avoid layout disruption
        let accumulated = 0;

        function onWheel(e) {
            e.preventDefault();
            accumulated += e.deltaY;
            accumulated = Math.max(0, Math.min(accumulated, maxScroll));

            if (!ticking) {
                ticking = true;
                requestAnimationFrame(applyScroll);
            }
        }

        function applyScroll() {
            ticking = false;
            const pct = accumulated / maxScroll; // 0 → 1

            // Hero text drifts upward
            if (heroContent) {
                heroContent.style.transform = `translateY(${-pct * 40}px)`;
                heroContent.style.opacity = `${1 - pct * 1.6}`;
            }

            // Spline layer scales very subtly in
            if (splineWrap) {
                splineWrap.style.transform = `scale(${1 + pct * 0.03})`;
            }

            // Scroll hint fades quickly
            if (scrollHint) {
                scrollHint.style.opacity = `${1 - pct * 4}`;
            }

            // At threshold → trigger dashboard transition
            if (accumulated >= maxScroll) {
                navigateToDashboard();
            }
        }

        function onTouch() {
            // On touch devices just let the button do the work
        }

        window.addEventListener('wheel', onWheel, { passive: false });
    })();


    /* ── Mouse parallax (subtle 3D tilt feel) ────────────── */
    (function initMouseParallax() {
        const heroContent = document.getElementById('heroContent');
        if (!heroContent) return;

        let mx = 0, my = 0;
        let cx = 0, cy = 0;
        let raf;

        function lerp(a, b, t) { return a + (b - a) * t; }

        function update() {
            cx = lerp(cx, mx, 0.06);
            cy = lerp(cy, my, 0.06);
            // Very subtle drift — keeps 3D dominant
            heroContent.style.transform = `translate(${cx * 5}px, ${cy * 4}px)`;
            raf = requestAnimationFrame(update);
        }

        let count = 0;
        document.addEventListener('mousemove', (e) => {
            // Performance fix: Simple throttle for mouse moves
            if (count++ % 2 === 0) {
                mx = (e.clientX / window.innerWidth - 0.5) * 0.8;
                my = (e.innerHeight ? (e.clientY / e.innerHeight - 0.5) : (e.clientY / window.innerHeight - 0.5)) * -0.5;
            }
        });

        update();
    })();


    /* ── CTA → Dashboard cinematic transition ────────────── */
    function navigateToDashboard() {
        const overlay = document.getElementById('pageTransition');
        if (!overlay || overlay.dataset.transitioning) return;
        overlay.dataset.transitioning = 'true';

        // 1. Fade in overlay
        overlay.classList.add('active');

        // 2. After fade completes, navigate
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 750);
    }

    // Button click
    const enterBtn = document.getElementById('enterBtn');
    if (enterBtn) {
        enterBtn.addEventListener('click', navigateToDashboard);
    }

    // Header quick link (instant for nav expectation)
    const headerBtn = document.getElementById('headerDashBtn');
    if (headerBtn) {
        headerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToDashboard();
        });
    }


    /* ── Dashboard page: fade in from black ──────────────── */
    // If the user is on the dashboard page (index.html), fade it in from black.
    // This creates the other side of the cinematic transition.
    if (window.location.pathname === '/dashboard') {
        document.documentElement.style.opacity = '0';
        document.documentElement.style.transition = 'opacity 0.8s ease';
        window.addEventListener('load', () => {
            requestAnimationFrame(() => {
                document.documentElement.style.opacity = '1';
            });
        });
    }

})();
