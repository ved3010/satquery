/**
 * SatQuery AI — Interactive Application Engine
 * Matches https://satquery-delta.vercel.app with full live state and canvas procedural EO renderers.
 */

document.addEventListener('DOMContentLoaded', () => {
    initArchitectureTimeline();
    initMultimodalCanvas();
    initTemporalSplitSlider();
    initDemoStudio();
    initConsoleStudio();
});

/* --------------------------------------------------------------------------
   1. Architecture Trace Inspector
   -------------------------------------------------------------------------- */
function initArchitectureTimeline() {
    const buttons = document.querySelectorAll('.step-trace-btn');
    const numEl = document.getElementById('stepDetailNumber');
    const titleEl = document.getElementById('stepDetailTitle');
    const descEl = document.getElementById('stepDetailDesc');
    const traceEl = document.getElementById('stepDetailTrace');

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
   2. Multimodal Optical + SAR Canvas Renderer
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

        // Base background
        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(0, 0, w, h);

        if (currentMode === 'optical') {
            // Optical composite: Greenish-brown agriculture & settlement
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, '#1c281a');
            grad.addColorStop(0.4, '#2d3b26');
            grad.addColorStop(0.8, '#3d4432');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // River / Water body
            ctx.fillStyle = '#102b3f';
            ctx.beginPath();
            ctx.moveTo(0, h * 0.4);
            ctx.bezierCurveTo(w * 0.3, h * 0.6, w * 0.6, h * 0.2, w, h * 0.5);
            ctx.lineTo(w, h * 0.7);
            ctx.bezierCurveTo(w * 0.6, h * 0.4, w * 0.3, h * 0.8, 0, h * 0.6);
            ctx.closePath();
            ctx.fill();

            // Built-up settlement pixels
            ctx.fillStyle = 'rgba(210, 205, 195, 0.45)';
            for (let i = 0; i < 400; i++) {
                const rx = (w * 0.6) + (Math.sin(i * 11) * 160);
                const ry = (h * 0.55) + (Math.cos(i * 7) * 90);
                ctx.fillRect(rx, ry, (i % 5) + 3, (i % 4) + 3);
            }

        } else if (currentMode === 'sar') {
            // SAR Backscatter: High grayscale texture + specular dark water
            ctx.fillStyle = '#141414';
            ctx.fillRect(0, 0, w, h);

            // Specular water (near 0 dB return)
            ctx.fillStyle = '#020202';
            ctx.beginPath();
            ctx.moveTo(0, h * 0.4);
            ctx.bezierCurveTo(w * 0.3, h * 0.6, w * 0.6, h * 0.2, w, h * 0.5);
            ctx.lineTo(w, h * 0.7);
            ctx.bezierCurveTo(w * 0.6, h * 0.4, w * 0.3, h * 0.8, 0, h * 0.6);
            ctx.closePath();
            ctx.fill();

            // Double-bounce bright urban corners (high dB backscatter)
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 500; i++) {
                const rx = (w * 0.6) + (Math.sin(i * 11) * 160);
                const ry = (h * 0.55) + (Math.cos(i * 7) * 90);
                ctx.fillRect(rx, ry, (i % 3) + 2, (i % 3) + 2);
            }

        } else { // Combined
            // Combined Fusion with extracted vector masks
            ctx.fillStyle = '#111827';
            ctx.fillRect(0, 0, w, h);

            // Water (Cyan)
            ctx.fillStyle = 'rgba(0, 210, 255, 0.6)';
            ctx.beginPath();
            ctx.moveTo(0, h * 0.4);
            ctx.bezierCurveTo(w * 0.3, h * 0.6, w * 0.6, h * 0.2, w, h * 0.5);
            ctx.lineTo(w, h * 0.7);
            ctx.bezierCurveTo(w * 0.6, h * 0.4, w * 0.3, h * 0.8, 0, h * 0.6);
            ctx.closePath();
            ctx.fill();

            // Built-up (Amber)
            ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
            for (let i = 0; i < 450; i++) {
                const rx = (w * 0.6) + (Math.sin(i * 11) * 160);
                const ry = (h * 0.55) + (Math.cos(i * 7) * 90);
                ctx.fillRect(rx, ry, (i % 4) + 3, (i % 4) + 3);
            }
        }
    }

    render();

    // Mode Tab Switcher
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
                badgeText.innerText = "Sentinel-2 Optical Composite";
                readsText.innerText = "Spectral signature, land-cover context, colour";
                limitText.innerText = "Blocked by cloud. Dark at night. Built-up and bare soil look alike.";
            } else if (currentMode === 'sar') {
                badgeText.innerText = "Sentinel-1 SAR Radar (C-Band VV/VH)";
                readsText.innerText = "Surface roughness, moisture, double-bounce structure";
                limitText.innerText = "No spectral color. Sensitive to speckle noise and terrain layover.";
            } else {
                badgeText.innerText = "Cross-Modal Fused Extraction";
                readsText.innerText = "8.32 km² built-up extracted · 24.39 km² water delineated";
                limitText.innerText = "Full all-weather operational resolution achieved.";
            }
        });
    });
}

/* --------------------------------------------------------------------------
   3. Bi-Temporal Split Comparison Slider
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

    // T1: June 2025 Baseline (Vegetation canopy)
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

    // Reveal Change Button
    let revealed = false;
    btnReveal.addEventListener('click', () => {
        revealed = !revealed;
        bboxes.style.opacity = revealed ? '1' : '0';
        btnReveal.style.borderColor = revealed ? '#00d2ff' : 'rgba(255,255,255,0.15)';
    });
}

/* --------------------------------------------------------------------------
   4. Interactive 4-Scenario Live Demo Studio
   -------------------------------------------------------------------------- */
const DEMO_SCENARIOS = {
    "urban": {
        "question": "Has the built-up area increased, decreased, or remained unchanged?",
        "task": "change_vqa",
        "t1_label": "JUNE 2025",
        "t2_label": "SEPTEMBER 2025",
        "answer": "Built-up area increased. Between the two acquisitions the built-up class grew from 9.71 km² to 15.08 km², a rise of 55.3%. The expansion is concentrated along the eastern edge of the settlement, where 5.37 km² of previously vegetated and bare land was converted.",
        "confidence": "0.87",
        "stat1": "+55.3%", "stat2": "5.37 km²", "stat3": "5.74 km²", "stat4": "−0.98 km²",
        "color": "#f59e0b"
    },
    "multimodal": {
        "question": "Use optical and SAR imagery together to identify built-up and water-covered regions.",
        "task": "optical_sar_fusion",
        "t1_label": "OPTICAL (S2)",
        "t2_label": "SAR (S1)",
        "answer": "Cross-modal fusion extraction resolved 8.32 km² built-up structures and 24.39 km² open water surface. Sentinel-1 C-band backscatter confirmed solid structures through atmospheric haze.",
        "confidence": "0.92",
        "stat1": "8.32 km²", "stat2": "24.39 km²", "stat3": "3.7%", "stat4": "10.8%",
        "color": "#00d2ff"
    },
    "water": {
        "question": "Where did the water-covered region change along the river basin?",
        "task": "water_flood_vqa",
        "t1_label": "PRE-MONSOON",
        "t2_label": "POST-MONSOON",
        "answer": "Water extent expanded by 145.8% (+18.4 km²) due to monsoon runoff. Standing water inundation is concentrated south of the main channel across low-lying agricultural plains.",
        "confidence": "0.89",
        "stat1": "+145.8%", "stat2": "18.40 km²", "stat3": "6.12 km²", "stat4": "+14.2 km²",
        "color": "#00d2ff"
    },
    "forest": {
        "question": "Describe the land-cover and identify any cleared forest areas.",
        "task": "scene_grounding",
        "t1_label": "CANOPY 2020",
        "t2_label": "CURRENT 2025",
        "answer": "Grounded analysis identified 3 distinct clearcut logging corridors in the north-east sector totaling 1.33 km² (133.1 ha) of tree canopy loss. Surrounding evergreen forest remains intact.",
        "confidence": "0.94",
        "stat1": "1.33 km²", "stat2": "133.1 ha", "stat3": "-20.3%", "stat4": "6.55 km²",
        "color": "#10b981"
    }
};

function initDemoStudio() {
    const scenarioBtns = document.querySelectorAll('.demo-scenario-btn');
    const canvas = document.getElementById('demoCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 800; canvas.height = 450;

    let activeKey = "urban";
    let activeDate = "t1";

    function drawDemoScene() {
        const sc = DEMO_SCENARIOS[activeKey];
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, 800, 450);

        if (activeDate === 't1') {
            ctx.fillStyle = '#1b2a1e';
            ctx.fillRect(0, 0, 800, 450);
            ctx.fillStyle = '#3a4a35';
            for (let i = 0; i < 300; i++) {
                ctx.fillRect(Math.sin(i*7)*350 + 400, Math.cos(i*3)*180 + 225, 6, 6);
            }
        } else {
            ctx.fillStyle = '#261b1b';
            ctx.fillRect(0, 0, 800, 450);
            ctx.fillStyle = sc.color;
            for (let i = 0; i < 500; i++) {
                ctx.fillRect(Math.sin(i*13)*300 + 400, Math.cos(i*5)*180 + 225, 8, 8);
            }
        }
    }

    drawDemoScene();

    scenarioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            scenarioBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeKey = btn.getAttribute('data-scenario');
            
            const sc = DEMO_SCENARIOS[activeKey];
            document.getElementById('demoQuestionPrompt').innerText = sc.question;
            document.getElementById('demoTaskTracePill').innerText = sc.task;
            document.getElementById('btnDemoDateT1').innerText = sc.t1_label;
            document.getElementById('btnDemoDateT2').innerText = sc.t2_label;
            
            document.getElementById('demoAnswerText').innerText = sc.answer;
            document.getElementById('demoConfidenceText').innerText = sc.confidence;
            document.getElementById('demoStat1').innerText = sc.stat1;
            document.getElementById('demoStat2').innerText = sc.stat2;
            document.getElementById('demoStat3').innerText = sc.stat3;
            document.getElementById('demoStat4').innerText = sc.stat4;

            drawDemoScene();
        });
    });

    const btnT1 = document.getElementById('btnDemoDateT1');
    const btnT2 = document.getElementById('btnDemoDateT2');
    btnT1.addEventListener('click', () => {
        btnT1.classList.add('active');
        btnT2.classList.remove('active');
        activeDate = 't1';
        drawDemoScene();
    });
    btnT2.addEventListener('click', () => {
        btnT2.classList.add('active');
        btnT1.classList.remove('active');
        activeDate = 't2';
        drawDemoScene();
    });

    // Run Demo Analysis Button Animation
    const btnAnalyze = document.getElementById('btnRunDemoAnalysis');
    const traceItems = document.querySelectorAll('#demoExecutionTraceList li');

    btnAnalyze.addEventListener('click', () => {
        btnAnalyze.disabled = true;
        btnAnalyze.innerText = "Executing DAG...";

        traceItems.forEach((li, idx) => {
            li.style.color = "rgba(255,255,255,0.4)";
            const dot = li.querySelector('span:first-child');
            if (dot) dot.style.borderColor = "rgba(255,255,255,0.2)";
            if (dot) dot.style.background = "transparent";

            setTimeout(() => {
                li.style.color = "#00d2ff";
                if (dot) dot.style.borderColor = "#00d2ff";
                if (dot) dot.style.background = "#00d2ff";

                if (idx === traceItems.length - 1) {
                    btnAnalyze.disabled = false;
                    btnAnalyze.innerHTML = `<span>Analyze</span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>`;
                    // Toggle to T2 to show evidence
                    btnT2.click();
                }
            }, (idx + 1) * 220);
        });
    });
}

/* --------------------------------------------------------------------------
   5. Studio Console Interactive Cases
   -------------------------------------------------------------------------- */
const CONSOLE_SCENES = {
    "kharagpur": {
        "title": "Has the built-up area increased?",
        "task": "change_vqa",
        "sub": "Kharagpur T1/T2 · 9:41 AM",
        "summary": "Built-up area increased 55.3%, from 9.71 km² to 15.08 km². Expansion concentrated on the eastern edge. Confidence 0.87. Evidence attached.",
        "narrative": "Analysis complete.\n\nThe two acquisitions were validated as a co-registered bi-temporal pair at 10 m ground sample distance, then routed to the change specialist and a change-VQA head.\n\n5.37 km² of previously vegetated and bare land was converted to built-up. 5.74 km² of vegetation was lost and the reservoir drew down by 0.98 km²."
    },
    "godavari": {
        "title": "Where did the water-covered region change?",
        "task": "flood_extent",
        "sub": "Godavari Basin · 8:12 AM",
        "summary": "Water extent up 145.8% (+18.4 km²) — standing inundation mapped south of the main channel through Sentinel-1 SAR all-weather radar.",
        "narrative": "Monsoon flood analysis complete.\n\nDense monsoon cloud cover bypassed using Sentinel-1 C-band synthetic aperture radar. Specular reflection dip (< -18dB) confirms extensive standing floodwater."
    },
    "cuttack": {
        "title": "Identify built-up and water from optical + SAR",
        "task": "cross_modal_fusion",
        "sub": "Cuttack Delta · Yesterday",
        "summary": "Cross-modal extraction resolved 8.32 km² built-up structures and 24.39 km² surface water.",
        "narrative": "Optical and SAR joint tensor fusion executed.\n\nSpectral reflectance separated vegetative canopy while radar double-bounce isolated urban masonry from bare sandbanks."
    },
    "nashik": {
        "title": "Describe the land-cover and major objects",
        "task": "scene_description",
        "sub": "Nashik Scene 04 · Yesterday",
        "summary": "Predominantly cropland with a settlement in the south-east quadrant. Grounding confidence 0.94.",
        "narrative": "Zero-shot visual question answering executed.\n\nAgricultural parcel vigour mapped via NDVI. Road network coordinates extracted and vectorized."
    },
    "sundarbans": {
        "title": "Highlight the water body referred to in the query",
        "task": "referring_grounding",
        "sub": "Sundarbans T2 · Mon",
        "summary": "Grounded tidal water inlet returned · surface extent 21.79 km².",
        "narrative": "Referring expression grounded directly to pixel polygon coordinates."
    }
};

function initConsoleStudio() {
    const sceneItems = document.querySelectorAll('#consoleSceneList li');
    const titleEl = document.getElementById('consoleQuestionTitle');
    const taskPill = document.getElementById('consoleTaskPill');
    const subMeta = document.getElementById('consoleSubMeta');
    const summaryText = document.getElementById('consoleSummaryText');
    const narrativeEl = document.getElementById('consoleNarrative');
    const btnRunLive = document.getElementById('btnConsoleRunLive');

    sceneItems.forEach(item => {
        item.addEventListener('click', () => {
            sceneItems.forEach(i => i.classList.remove('active-scene'));
            item.classList.add('active-scene');
            
            const key = item.getAttribute('data-scene');
            const data = CONSOLE_SCENES[key] || CONSOLE_SCENES.kharagpur;

            titleEl.innerText = data.title;
            taskPill.innerText = data.task;
            subMeta.innerText = data.sub;
            summaryText.innerText = data.summary;
            
            narrativeEl.innerHTML = data.narrative.split('\n\n').map(p => `<p>${p}</p>`).join('');
        });
    });

    btnRunLive.addEventListener('click', async () => {
        btnRunLive.innerText = "Running...";
        btnRunLive.disabled = true;

        try {
            const resp = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: titleEl.innerText })
            });
            const data = await resp.json();
            
            if (data.synthesized_report) {
                summaryText.innerText = data.synthesized_report.headline;
                narrativeEl.innerHTML = `<p>${data.synthesized_report.summary_text}</p>`;
            }
        } catch (e) {
            console.error(e);
        } finally {
            btnRunLive.innerText = "Run Agent";
            btnRunLive.disabled = false;
        }
    });
}
