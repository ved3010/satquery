/**
 * SatQuery AI — Interactive Application Engine
 * Matches https://satquery-delta.vercel.app with Past vs Present Imagery, Bitemporal Analysis & 7-Step Trace.
 */

document.addEventListener('DOMContentLoaded', () => {
    initLiveQueryStudio();
    initArchitectureTimeline();
    initMultimodalCanvas();
    initTemporalSplitSlider();
});

/* --------------------------------------------------------------------------
   1. Live Area Query Studio (Past vs Present Development Engine)
   -------------------------------------------------------------------------- */
function initLiveQueryStudio() {
    const inputEl = document.getElementById('liveQueryInput');
    const btnRun = document.getElementById('btnRunLiveQuery');
    const canvas = document.getElementById('liveViewportCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 1200;
    canvas.height = 675;

    let currentMode = "dual"; // dual, past, present, change
    let currentScenarioData = {
        location: "Kharagpur Development Corridor",
        t1_date: "JUNE 2021 (T1)",
        t2_date: "SEPTEMBER 2025 (T2)",
        growth: "+55.3%",
        newArea: "5.37 km²",
        greenShift: "−5.74 km²",
        waterShift: "−0.98 km²",
        confidence: "0.87",
        narrative: "Between the <strong>June 2021 (Past)</strong> and <strong>September 2025 (Present)</strong> acquisitions, the built-up area expanded by <strong>+55.3%</strong>, growing from 9.71 km² to 15.08 km². The development is heavily concentrated along the eastern corridor (Region R01, 5.37 km² of new structures) with additional infill construction (Region R02). Vegetation declined by 5.74 km²."
    };

    function renderLiveViewport() {
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(0, 0, w, h);

        if (currentMode === "past") {
            // Past Image (T1 Baseline): Greenish vegetative canopy with small initial settlement
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, '#1c281a');
            grad.addColorStop(0.5, '#283824');
            grad.addColorStop(1, '#33402c');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // Water stream
            ctx.fillStyle = '#102b3f';
            ctx.beginPath();
            ctx.moveTo(0, h * 0.35);
            ctx.bezierCurveTo(w * 0.4, h * 0.55, w * 0.7, h * 0.25, w, h * 0.45);
            ctx.lineTo(w, h * 0.6);
            ctx.bezierCurveTo(w * 0.7, h * 0.4, w * 0.4, h * 0.7, 0, h * 0.5);
            ctx.closePath();
            ctx.fill();

            // Initial core settlement (white/grey dots)
            ctx.fillStyle = 'rgba(230, 225, 215, 0.7)';
            for (let i = 0; i < 250; i++) {
                const rx = (w * 0.4) + (Math.sin(i * 13) * 110);
                const ry = (h * 0.5) + (Math.cos(i * 7) * 70);
                ctx.fillRect(rx, ry, (i % 6) + 4, (i % 5) + 4);
            }

        } else if (currentMode === "present") {
            // Present Image (T2): Massive urban expansion, road grid, new concrete buildings
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, '#26201b');
            grad.addColorStop(0.5, '#302820');
            grad.addColorStop(1, '#252e22');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // Water stream (slightly drawn down)
            ctx.fillStyle = '#102b3f';
            ctx.beginPath();
            ctx.moveTo(0, h * 0.37);
            ctx.bezierCurveTo(w * 0.4, h * 0.53, w * 0.7, h * 0.27, w, h * 0.43);
            ctx.lineTo(w, h * 0.57);
            ctx.bezierCurveTo(w * 0.7, h * 0.42, w * 0.4, h * 0.67, 0, h * 0.48);
            ctx.closePath();
            ctx.fill();

            // Roads & Infrastructure lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(w * 0.2, h * 0.8);
            ctx.lineTo(w * 0.85, h * 0.3);
            ctx.stroke();

            // Expanded new concrete structures (Amber/White)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            for (let i = 0; i < 900; i++) {
                const rx = (w * 0.58) + (Math.sin(i * 17) * 220);
                const ry = (h * 0.48) + (Math.cos(i * 11) * 140);
                ctx.fillRect(rx, ry, (i % 8) + 5, (i % 6) + 5);
            }

        } else if (currentMode === "change") {
            // Change Detection Mask (Δ): Dark background with Red/Amber highlighting new development
            ctx.fillStyle = '#080c14';
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = 'rgba(245, 158, 11, 0.9)'; // Amber new structures
            for (let i = 0; i < 750; i++) {
                const rx = (w * 0.62) + (Math.sin(i * 17) * 200);
                const ry = (h * 0.48) + (Math.cos(i * 11) * 130);
                ctx.fillRect(rx, ry, (i % 7) + 5, (i % 6) + 5);
            }

            ctx.fillStyle = 'rgba(239, 68, 68, 0.65)'; // Red canopy loss
            for (let i = 0; i < 400; i++) {
                const rx = (w * 0.55) + (Math.sin(i * 9) * 260);
                const ry = (h * 0.62) + (Math.cos(i * 13) * 90);
                ctx.fillRect(rx, ry, (i % 5) + 3, (i % 5) + 3);
            }

        } else { // Dual Side-by-Side
            // Left Half: Past (T1)
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, w / 2, h);
            ctx.clip();
            
            ctx.fillStyle = '#1e2c1c';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(230, 225, 215, 0.65)';
            for (let i = 0; i < 250; i++) {
                ctx.fillRect((w * 0.25) + Math.sin(i*13)*70, (h * 0.5) + Math.cos(i*7)*60, 5, 5);
            }
            ctx.restore();

            // Right Half: Present (T2)
            ctx.save();
            ctx.beginPath();
            ctx.rect(w / 2, 0, w / 2, h);
            ctx.clip();
            
            ctx.fillStyle = '#2c221a';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
            for (let i = 0; i < 700; i++) {
                ctx.fillRect((w * 0.72) + Math.sin(i*17)*160, (h * 0.48) + Math.cos(i*11)*120, 7, 7);
            }
            ctx.restore();

            // Vertical Center Divider Line
            ctx.strokeStyle = '#00d2ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(w / 2, 0);
            ctx.lineTo(w / 2, h);
            ctx.stroke();
        }
    }

    renderLiveViewport();

    // Mode Buttons
    const modeBtns = {
        dual: document.getElementById('btnViewDual'),
        past: document.getElementById('btnViewPast'),
        present: document.getElementById('btnViewPresent'),
        change: document.getElementById('btnViewChange')
    };

    Object.keys(modeBtns).forEach(key => {
        const btn = modeBtns[key];
        if (!btn) return;
        btn.addEventListener('click', () => {
            Object.values(modeBtns).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = key;
            
            // Show bboxes only on present, dual, and change
            const bboxes = document.getElementById('liveBBoxes');
            if (bboxes) {
                bboxes.style.display = (key === 'past') ? 'none' : 'block';
            }
            renderLiveViewport();
        });
    });

    // Run Agent Analysis Trigger
    async function executeLiveAnalysis(queryText) {
        btnRun.disabled = true;
        btnRun.innerHTML = `<span>Compiling DAG...</span><span class="animate-spin">⚙️</span>`;

        const traceList = document.getElementById('liveTraceList');
        const traceItems = traceList ? traceList.querySelectorAll('li') : [];

        // Animate 7-Step Trace
        traceItems.forEach((li, idx) => {
            li.style.color = "rgba(255,255,255,0.3)";
            setTimeout(() => {
                li.style.color = "#00d2ff";
            }, (idx + 1) * 180);
        });

        try {
            const resp = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: queryText })
            });

            if (resp.ok) {
                const data = await resp.json();
                const rep = data.synthesized_report || {};
                const metrics = rep.metrics || {};

                document.getElementById('viewportLocationTitle').innerText = `${data.query} · Sentinel-2 (10m GSD)`;
                
                if (data.temporal_range) {
                    document.getElementById('tagDateT1').innerText = `PAST: ${data.temporal_range.t1} (T1)`;
                    document.getElementById('tagDateT2').innerText = `PRESENT: ${data.temporal_range.t2} (T2)`;
                }

                if (metrics.impact_area_sq_km) {
                    document.getElementById('metricNewArea').innerText = `${metrics.impact_area_sq_km} km²`;
                    document.getElementById('metricGrowth').innerText = `+${metrics.impact_percentage}%`;
                }

                if (rep.summary_text) {
                    document.getElementById('liveNarrativeText').innerHTML = rep.summary_text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            renderLiveViewport();
            btnRun.disabled = false;
            btnRun.innerHTML = `<span>Run Agent Analysis</span><span>⚡</span>`;
        }
    }

    btnRun.addEventListener('click', () => {
        const q = inputEl.value.trim();
        if (q) executeLiveAnalysis(q);
    });

    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnRun.click();
    });

    // Quick Scenario Chips
    const quickChips = document.querySelectorAll('.quick-chip');
    quickChips.forEach(chip => {
        chip.addEventListener('click', () => {
            quickChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const q = chip.getAttribute('data-q');
            inputEl.value = q;
            executeLiveAnalysis(q);
        });
    });

    // Download Image Actions
    document.getElementById('btnDownloadPast').addEventListener('click', () => {
        currentMode = 'past';
        renderLiveViewport();
        const link = document.createElement('a');
        link.download = 'satquery-past-acquisition-t1.png';
        link.href = canvas.toDataURL();
        link.click();
        currentMode = 'dual';
        renderLiveViewport();
    });

    document.getElementById('btnDownloadPresent').addEventListener('click', () => {
        currentMode = 'present';
        renderLiveViewport();
        const link = document.createElement('a');
        link.download = 'satquery-present-acquisition-t2.png';
        link.href = canvas.toDataURL();
        link.click();
        currentMode = 'dual';
        renderLiveViewport();
    });
}

/* --------------------------------------------------------------------------
   2. Architecture Trace Inspector
   -------------------------------------------------------------------------- */
function initArchitectureTimeline() {
    const buttons = document.querySelectorAll('.step-trace-btn');
    const numEl = document.getElementById('stepDetailNumber');
    const titleEl = document.getElementById('stepDetailTitle');
    const descEl = document.getElementById('stepDetailDesc');
    const traceEl = document.getElementById('stepDetailTrace');
    if (!numEl) return;

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const step = btn.getAttribute('data-step').padStart(2, '0');
            const title = btn.getAttribute('data-title');
            const desc = btn.getAttribute('data-desc');
            const trace = btn.getAttribute('data-trace');

            numEl.innerText = step;
            titleEl.innerText = title;
            descEl.innerText = desc;
            traceEl.innerText = trace;
        });
    });
}

/* --------------------------------------------------------------------------
   3. Multimodal Optical + SAR Canvas Renderer
   -------------------------------------------------------------------------- */
function initMultimodalCanvas() {
    const canvas = document.getElementById('multimodalCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 960;
    canvas.height = 540;

    let currentMode = 'optical';

    function render() {
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(0, 0, w, h);

        if (currentMode === 'optical') {
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, '#1c281a');
            grad.addColorStop(0.4, '#2d3b26');
            grad.addColorStop(0.8, '#3d4432');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = '#102b3f';
            ctx.beginPath();
            ctx.moveTo(0, h * 0.4);
            ctx.bezierCurveTo(w * 0.3, h * 0.6, w * 0.6, h * 0.2, w, h * 0.5);
            ctx.lineTo(w, h * 0.7);
            ctx.bezierCurveTo(w * 0.6, h * 0.4, w * 0.3, h * 0.8, 0, h * 0.6);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(210, 205, 195, 0.45)';
            for (let i = 0; i < 400; i++) {
                const rx = (w * 0.6) + (Math.sin(i * 11) * 160);
                const ry = (h * 0.55) + (Math.cos(i * 7) * 90);
                ctx.fillRect(rx, ry, (i % 5) + 3, (i % 4) + 3);
            }

        } else if (currentMode === 'sar') {
            ctx.fillStyle = '#141414';
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = '#020202';
            ctx.beginPath();
            ctx.moveTo(0, h * 0.4);
            ctx.bezierCurveTo(w * 0.3, h * 0.6, w * 0.6, h * 0.2, w, h * 0.5);
            ctx.lineTo(w, h * 0.7);
            ctx.bezierCurveTo(w * 0.6, h * 0.4, w * 0.3, h * 0.8, 0, h * 0.6);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 500; i++) {
                const rx = (w * 0.6) + (Math.sin(i * 11) * 160);
                const ry = (h * 0.55) + (Math.cos(i * 7) * 90);
                ctx.fillRect(rx, ry, (i % 3) + 2, (i % 3) + 2);
            }

        } else { // Combined
            ctx.fillStyle = '#111827';
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = 'rgba(0, 210, 255, 0.6)';
            ctx.beginPath();
            ctx.moveTo(0, h * 0.4);
            ctx.bezierCurveTo(w * 0.3, h * 0.6, w * 0.6, h * 0.2, w, h * 0.5);
            ctx.lineTo(w, h * 0.7);
            ctx.bezierCurveTo(w * 0.6, h * 0.4, w * 0.3, h * 0.8, 0, h * 0.6);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
            for (let i = 0; i < 450; i++) {
                const rx = (w * 0.6) + (Math.sin(i * 11) * 160);
                const ry = (h * 0.55) + (Math.cos(i * 7) * 90);
                ctx.fillRect(rx, ry, (i % 4) + 3, (i % 4) + 3);
            }
        }
    }

    render();

    const tabs = document.querySelectorAll('.modal-tab-btn');
    const badgeText = document.getElementById('multimodalBadgeText');
    const readsText = document.getElementById('modalityReadsText');
    const limitText = document.getElementById('modalityLimitText');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentMode = tab.getAttribute('data-modality');
            render();

            if (currentMode === 'optical') {
                if (badgeText) badgeText.innerText = "Sentinel-2 Optical Composite";
                if (readsText) readsText.innerText = "Spectral signature, land-cover context, colour";
                if (limitText) limitText.innerText = "Blocked by cloud. Dark at night. Built-up and bare soil look alike.";
            } else if (currentMode === 'sar') {
                if (badgeText) badgeText.innerText = "Sentinel-1 SAR Radar (C-Band VV/VH)";
                if (readsText) readsText.innerText = "Surface roughness, moisture, double-bounce structure";
                if (limitText) limitText.innerText = "No spectral color. Sensitive to speckle noise and terrain layover.";
            } else {
                if (badgeText) badgeText.innerText = "Cross-Modal Fused Extraction";
                if (readsText) readsText.innerText = "8.32 km² built-up extracted · 24.39 km² water delineated";
                if (limitText) limitText.innerText = "Full all-weather operational resolution achieved.";
            }
        });
    });
}

/* --------------------------------------------------------------------------
   4. Bi-Temporal Split Comparison Slider
   -------------------------------------------------------------------------- */
function initTemporalSplitSlider() {
    const container = document.getElementById('temporalSplitContainer');
    const clipper = document.getElementById('temporalSplitClipper');
    const divider = document.getElementById('splitDivider');
    const btnReveal = document.getElementById('btnRevealChange');
    const bboxes = document.getElementById('temporalBoundingBoxes');

    const c1 = document.getElementById('temporalCanvasT1');
    const c2 = document.getElementById('temporalCanvasT2');
    if (!container || !c1 || !c2) return;

    c1.width = 960; c1.height = 540;
    c2.width = 960; c2.height = 540;

    const ctx1 = c1.getContext('2d');
    const ctx2 = c2.getContext('2d');

    // T1: June 2021 Baseline
    ctx1.fillStyle = '#1c281a';
    ctx1.fillRect(0, 0, 960, 540);
    ctx1.fillStyle = 'rgba(210, 205, 195, 0.4)';
    for (let i = 0; i < 200; i++) {
        ctx1.fillRect(400 + Math.sin(i)*80, 240 + Math.cos(i)*60, 5, 5);
    }

    // T2: September 2025 Expanded Built-up
    ctx2.fillStyle = '#2d241c';
    ctx2.fillRect(0, 0, 960, 540);
    ctx2.fillStyle = 'rgba(245, 158, 11, 0.85)';
    for (let i = 0; i < 600; i++) {
        ctx2.fillRect(400 + Math.sin(i)*160, 240 + Math.cos(i)*110, 6, 6);
    }

    let isDown = false;

    function setSplit(pct) {
        const p = Math.max(5, Math.min(95, pct));
        clipper.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
        divider.style.left = `${p}%`;
    }

    container.addEventListener('pointerdown', (e) => {
        isDown = true;
        updateSlider(e);
    });

    window.addEventListener('pointermove', (e) => {
        if (!isDown) return;
        updateSlider(e);
    });

    window.addEventListener('pointerup', () => { isDown = false; });

    function updateSlider(e) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = (x / rect.width) * 100;
        setSplit(pct);
    }

    if (btnReveal) {
        let revealed = false;
        btnReveal.addEventListener('click', () => {
            revealed = !revealed;
            if (bboxes) bboxes.style.opacity = revealed ? '1' : '0';
            btnReveal.style.borderColor = revealed ? '#00d2ff' : 'rgba(255,255,255,0.15)';
        });
    }
}
