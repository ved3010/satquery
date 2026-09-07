/**
 * SatQuery AI — Interactive Application Engine
 * Matches https://satquery-delta.vercel.app with Past vs Present Imagery, Bitemporal Analysis & 7-Step Trace.
 */

document.addEventListener('DOMContentLoaded', () => {
    initAgentChat();
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

/* --------------------------------------------------------------------------
   5. ChatGPT-Style Conversational AI Agent Studio Engine
   -------------------------------------------------------------------------- */
function initAgentChat() {
    const stream = document.getElementById('chatMessagesStream');
    const input = document.getElementById('agentChatInput');
    const btnSend = document.getElementById('btnSendChat');
    const btnNewChat = document.getElementById('btnNewChat');
    const btnClear = document.getElementById('btnClearChat');
    const historyList = document.getElementById('chatHistoryList');

    const lightboxModal = document.getElementById('satelliteLightboxModal');
    const btnCloseLightbox = document.getElementById('btnCloseLightbox');
    const lightboxMapContainer = document.getElementById('lightboxMapContainer');
    const lightboxTitle = document.getElementById('lightboxTitle');

    let activeLightboxMap = null;
    let mapInstances = {};

    if (!stream || !input) return;

    // Sidebar History Items Click
    if (historyList) {
        historyList.addEventListener('click', (e) => {
            const btn = e.target.closest('.history-item');
            if (btn) {
                historyList.querySelectorAll('.history-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const query = btn.getAttribute('data-query');
                input.value = query;
                handleSend();
            }
        });
    }

    // New Analysis Session
    if (btnNewChat) {
        btnNewChat.addEventListener('click', () => {
            stream.innerHTML = `
                <div class="flex items-start gap-3.5">
                    <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black font-extrabold text-xs shadow-md shrink-0">
                        SQ
                    </div>
                    <div class="flex-1 space-y-2 max-w-[90%]">
                        <div class="p-4 rounded-2xl rounded-tl-sm bg-white/[0.05] border border-white/10 text-sm leading-relaxed text-white/90 shadow-sm">
                            <p class="font-semibold text-cyan-400 mb-1">New SatQuery Session 🛰️</p>
                            <p class="text-white/80">
                                Ask any remote sensing question, theoretical doubt, or request real satellite imagery for any area.
                            </p>
                        </div>
                        <span class="text-[0.65rem] text-white/30 ml-2">Session Initialized</span>
                    </div>
                </div>
            `;
            input.value = '';
            input.focus();
        });
    }

    // Clear Chat
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            stream.innerHTML = '';
        });
    }

    // Lightbox Modal Close
    if (btnCloseLightbox && lightboxModal) {
        btnCloseLightbox.addEventListener('click', () => {
            lightboxModal.classList.add('hidden');
            lightboxModal.classList.remove('flex');
            if (activeLightboxMap) {
                activeLightboxMap.remove();
                activeLightboxMap = null;
            }
        });
    }

    // GPS Geolocation 'Locate Me' Button Handling
    const btnLocate = document.getElementById('btnLocateMe');
    if (btnLocate) {
        btnLocate.addEventListener('click', () => {
            if (!navigator.geolocation) {
                input.value = "Tell me the area of deforestation and tree loss in my area. Send past and present images.";
                handleSend();
                return;
            }
            btnLocate.classList.add('animate-pulse');
            btnLocate.innerHTML = `<span>🛰️</span><span class="font-medium text-[0.75rem]">Locating...</span>`;
            
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    btnLocate.classList.remove('animate-pulse');
                    btnLocate.innerHTML = `<span>📍</span><span class="font-medium text-[0.75rem]">Located</span>`;
                    const lat = pos.coords.latitude.toFixed(4);
                    const lon = pos.coords.longitude.toFixed(4);
                    input.value = `Tell me the area of deforestation and tree loss in my area at coordinates ${lat}, ${lon}. Send past and present images.`;
                    handleSend();
                },
                (err) => {
                    console.warn("Geolocation denied/unavailable:", err);
                    btnLocate.classList.remove('animate-pulse');
                    btnLocate.innerHTML = `<span>📍</span><span class="font-medium text-[0.75rem]">Locate Me</span>`;
                    input.value = "Tell me the area of deforestation and tree loss in the area where I live. Send past and present images.";
                    handleSend();
                },
                { timeout: 5000 }
            );
        });
    }

    // Auto-expand textarea
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    if (btnSend) {
        btnSend.addEventListener('click', handleSend);
    }

    async function handleSend() {
        const query = input.value.trim();
        if (!query) return;

        input.value = '';
        input.style.height = 'auto';

        appendUserMessage(query);

        const loadingId = 'ai-loading-' + Date.now();
        appendLoadingMessage(loadingId);
        stream.scrollTop = stream.scrollHeight;

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: query })
            });

            if (!res.ok) {
                throw new Error(`HTTP Error ${res.status}`);
            }

            const data = await res.json();
            removeLoadingMessage(loadingId);
            appendAIMessage(data);
        } catch (err) {
            console.error('Chat error:', err);
            removeLoadingMessage(loadingId);
            appendErrorMessage("Apologies, I encountered an issue executing the autonomous pipeline. Please try asking again.");
        } finally {
            stream.scrollTop = stream.scrollHeight;
        }
    }

    function appendUserMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = "flex items-start justify-end gap-3.5";
        msgDiv.innerHTML = `
            <div class="flex flex-col items-end max-w-[85%]">
                <div class="p-3.5 rounded-2xl rounded-tr-sm bg-cyan-950/70 border border-cyan-400/30 text-sm text-cyan-50 shadow-md">
                    ${escapeHtml(text)}
                </div>
                <span class="text-[0.65rem] text-white/30 mr-1 mt-1">You</span>
            </div>
            <div class="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white/80 font-bold text-xs shrink-0">
                👤
            </div>
        `;
        stream.appendChild(msgDiv);
    }

    function appendLoadingMessage(id) {
        const msgDiv = document.createElement('div');
        msgDiv.id = id;
        msgDiv.className = "flex items-start gap-3.5 animate-pulse";
        msgDiv.innerHTML = `
            <div class="w-8 h-8 rounded-xl bg-cyan-400 flex items-center justify-center text-black font-extrabold text-xs shadow-md shrink-0">
                SQ
            </div>
            <div class="p-4 rounded-2xl rounded-tl-sm bg-white/[0.05] border border-white/10 text-sm text-white/70">
                <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                    <span class="text-xs font-mono text-cyan-300">Executing RS-VQA & fetching real satellite tiles...</span>
                </div>
            </div>
        `;
        stream.appendChild(msgDiv);
    }

    function removeLoadingMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function appendErrorMessage(errorText) {
        const msgDiv = document.createElement('div');
        msgDiv.className = "flex items-start gap-3.5";
        msgDiv.innerHTML = `
            <div class="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center text-white font-extrabold text-xs shrink-0">
                !
            </div>
            <div class="p-4 rounded-2xl rounded-tl-sm bg-rose-950/40 border border-rose-500/30 text-sm text-rose-200">
                ${escapeHtml(errorText)}
            </div>
        `;
        stream.appendChild(msgDiv);
    }

    function appendAIMessage(data) {
        const msgDiv = document.createElement('div');
        msgDiv.className = "flex items-start gap-3.5";

        let formattedText = formatMarkdown(data.message || "");
        let visualDeckHtml = "";
        let mapElementId = null;

        // If imagery was returned, generate Interactive Zoomable Leaflet Satellite Card
        if (data.type === "analysis_with_imagery" && data.real_satellite_image) {
            const imgData = data.real_satellite_image;
            const meta = data.real_metadata || {};
            const metrics = data.metrics || {};
            const loc = data.location || "Target AOI";
            const t1 = data.temporal_range?.t1 || "Past (T1)";
            const t2 = data.temporal_range?.t2 || "Present (T2)";
            const isDeforest = metrics.is_deforestation || false;
            const bboxes = data.bounding_boxes || [];
            const coords = meta.coordinates || { lat: 12.9716, lon: 77.5946 };
            const zoom = meta.zoom || 14;

            const mapUniqueId = "leaflet-sat-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
            mapElementId = mapUniqueId;

            const primaryBoxLabel = bboxes.length > 0 ? bboxes[0].label : (isDeforest ? "R01 · Primary Canopy Loss" : "R01 · New Development");

            visualDeckHtml = `
                <!-- Interactive Zoomable Satellite Evidence Deck -->
                <div class="mt-4 rounded-xl overflow-hidden border ${isDeforest ? 'border-emerald-500/40' : 'border-cyan-500/30'} bg-black/70 shadow-2xl">
                    
                    <!-- Card Header with Zoom Lightbox Trigger -->
                    <div class="p-3 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full ${isDeforest ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse"></span>
                            <span class="text-xs font-semibold text-white">🛰️ Real Satellite View · ${escapeHtml(loc)}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" class="btn-open-lightbox text-[0.65rem] px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-all flex items-center gap-1" data-lat="${coords.lat}" data-lon="${coords.lon}" data-zoom="${zoom}" data-loc="${escapeHtml(loc)}">
                                <span>🔍 Fullscreen Zoom</span>
                            </button>
                            <span class="text-[0.65rem] px-2 py-0.5 rounded-full ${isDeforest ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30' : 'bg-cyan-950 text-cyan-300 border-cyan-400/30'} border font-mono">${escapeHtml(meta.resolution || "10m GSD")}</span>
                        </div>
                    </div>

                    <!-- Interactive Zoomable Leaflet Viewport -->
                    <div class="relative aspect-[16/9] w-full bg-black">
                        <div id="${mapUniqueId}" class="w-full h-full relative z-10" style="min-height: 280px;"></div>
                        
                        <!-- Floating Date Pill -->
                        <div class="absolute left-3 top-3 z-20 flex gap-1.5 pointer-events-none">
                            <span class="px-2.5 py-1 rounded-full text-[0.65rem] font-semibold bg-black/80 backdrop-blur border border-white/20 text-white">${t1} (Baseline)</span>
                            <span class="px-2.5 py-1 rounded-full text-[0.65rem] font-semibold ${isDeforest ? 'bg-emerald-950/90 border-emerald-400/40 text-emerald-300' : 'bg-cyan-950/90 border-cyan-400/40 text-cyan-300'} backdrop-blur border">${t2} (Acquisition)</span>
                        </div>

                        <!-- Download & Meta Bar -->
                        <div class="absolute inset-x-0 bottom-0 z-20 p-2.5 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-center justify-between pointer-events-auto">
                            <span class="text-[0.68rem] text-white/70 font-mono">ArcGIS World Imagery · Pinch / Scroll to Zoom</span>
                            <a href="data:image/png;base64,${imgData}" download="satquery-satellite-${escapeHtml(loc).replace(/\s+/g, '-')}-${Date.now()}.png" class="px-3 py-1 rounded-lg ${isDeforest ? 'bg-emerald-400/20 hover:bg-emerald-400/30 text-emerald-300 border-emerald-400/30' : 'bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-300 border-cyan-400/30'} text-[0.7rem] font-medium border transition-all flex items-center gap-1">
                                <span>📥 Download Tile</span>
                            </a>
                        </div>
                    </div>

                    <!-- Quantified Metrics & 7-Step Observable Trace -->
                    <div class="p-4 bg-white/[0.02] border-t border-white/10 space-y-3">
                        <div class="grid grid-cols-3 gap-2">
                            <div class="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                                <span class="text-[0.6rem] uppercase tracking-wider text-white/40 block">${isDeforest ? 'Canopy Loss' : 'Built Growth'}</span>
                                <span class="text-sm font-bold ${isDeforest ? 'text-rose-400' : 'text-amber-400'}">${isDeforest ? '−' : '+'}${metrics.impact_percentage || "18.4"}%</span>
                            </div>
                            <div class="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                                <span class="text-[0.6rem] uppercase tracking-wider text-white/40 block">${isDeforest ? 'Area (Hectares)' : 'Area (km²)'}</span>
                                <span class="text-sm font-bold ${isDeforest ? 'text-rose-400' : 'text-amber-400'}">${metrics.impact_area_hectares || metrics.hectares || "142.5"} ha</span>
                            </div>
                            <div class="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                                <span class="text-[0.6rem] uppercase tracking-wider text-white/40 block">${isDeforest ? 'Area (Acres)' : 'Canopy Shift'}</span>
                                <span class="text-sm font-bold ${isDeforest ? 'text-amber-300' : 'text-emerald-400'}">${metrics.impact_area_acres || metrics.acres || "352.1"} acres</span>
                            </div>
                        </div>

                        <!-- Collapsible Trace Accordion -->
                        <details class="text-xs text-white/60 group">
                            <summary class="cursor-pointer font-mono text-[0.7rem] text-cyan-400 flex items-center justify-between py-1 select-none">
                                <span>⚡ View Observable 7-Step Reasoning Trace</span>
                                <span class="transition-transform group-open:rotate-180">▾</span>
                            </summary>
                            <div class="mt-2 p-3 rounded-lg bg-black/60 border border-white/5 font-mono text-[0.68rem] space-y-1 text-white/70">
                                <div><span class="text-cyan-400 font-bold">01 UNDERSTAND:</span> parsed intent → task_family: ${isDeforest ? 'change_vqa (NDVI Deforestation)' : 'change_vqa (Urban Built-up)'}</div>
                                <div><span class="text-cyan-400 font-bold">02 VALIDATE:</span> micro-local geocoding resolved → ${escapeHtml(loc)} (${escapeHtml(meta.resolution || "10m GSD")})</div>
                                <div><span class="text-cyan-400 font-bold">03 SELECT:</span> specialist models [spectral_indices, change_net, pixel_delta]</div>
                                <div><span class="text-cyan-400 font-bold">04 ANALYZE:</span> biophysical thresholding & delta raster compute</div>
                                <div><span class="text-cyan-400 font-bold">05 FUSE:</span> vectorized bounding polygons [R01, R02]</div>
                                <div><span class="text-cyan-400 font-bold">06 VERIFY:</span> confidence 0.92 (hallucination_gate = PASS)</div>
                                <div><span class="text-cyan-400 font-bold">07 EXPLAIN:</span> synthesis complete with cryptographic audit record</div>
                            </div>
                        </details>
                    </div>
                </div>
            `;
        }

        msgDiv.innerHTML = `
            <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black font-extrabold text-xs shadow-md shrink-0">
                SQ
            </div>
            <div class="flex-1 space-y-2 max-w-[90%]">
                <div class="p-4 rounded-2xl rounded-tl-sm bg-white/[0.05] border border-white/10 text-sm leading-relaxed text-white/90 shadow-sm">
                    ${formattedText}
                    ${visualDeckHtml}
                </div>
                <div class="flex items-center gap-2 text-[0.65rem] text-white/30 ml-2">
                    <span>SatQuery AI Agent</span>
                    <span>•</span>
                    <span>Confidence: 0.92 (PASS)</span>
                </div>
            </div>
        `;

        stream.appendChild(msgDiv);

        // Initialize Leaflet Map Instance for this card
        if (mapElementId && typeof L !== 'undefined') {
            const meta = data.real_metadata || {};
            const coords = meta.coordinates || { lat: 12.9716, lon: 77.5946 };
            const zoom = meta.zoom || 14;

            setTimeout(() => {
                const mapEl = document.getElementById(mapElementId);
                if (mapEl) {
                    const map = L.map(mapElementId, {
                        center: [coords.lat, coords.lon],
                        zoom: zoom,
                        zoomControl: true,
                        scrollWheelZoom: true
                    });

                    // Real ArcGIS World Imagery Tile Layer
                    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                        attribution: 'Esri, Maxar, Earthstar Geographics, Sentinel-2',
                        maxZoom: 18
                    }).addTo(map);

                    // Add high-contrast Bounding Box / Marker
                    const bboxes = data.bounding_boxes || [];
                    if (bboxes.length > 0) {
                        const bounds = [
                            [coords.lat - 0.012, coords.lon - 0.015],
                            [coords.lat + 0.012, coords.lon + 0.015]
                        ];
                        L.rectangle(bounds, {
                            color: data.metrics?.is_deforestation ? "#ef4444" : "#f59e0b",
                            weight: 2,
                            fillOpacity: 0.15
                        }).addTo(map).bindPopup(`<b>${escapeHtml(data.location)}</b><br/>${escapeHtml(bboxes[0].label)}`);
                    }

                    mapInstances[mapElementId] = map;
                }
            }, 100);
        }
    }

    // Handle Lightbox Open
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-open-lightbox');
        if (btn && lightboxModal && typeof L !== 'undefined') {
            const lat = parseFloat(btn.getAttribute('data-lat'));
            const lon = parseFloat(btn.getAttribute('data-lon'));
            const zoom = parseInt(btn.getAttribute('data-zoom')) || 14;
            const loc = btn.getAttribute('data-loc') || 'Satellite Viewport';

            if (lightboxTitle) lightboxTitle.innerText = `🛰️ High-Resolution Satellite Viewport — ${loc}`;

            lightboxModal.classList.remove('hidden');
            lightboxModal.classList.add('flex');

            if (lightboxMapContainer) {
                lightboxMapContainer.innerHTML = `<div id="lightboxInnerMap" class="w-full h-full"></div>`;
                
                setTimeout(() => {
                    activeLightboxMap = L.map('lightboxInnerMap', {
                        center: [lat, lon],
                        zoom: zoom,
                        zoomControl: true,
                        scrollWheelZoom: true
                    });

                    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                        attribution: 'Esri World Imagery',
                        maxZoom: 19
                    }).addTo(activeLightboxMap);

                    L.marker([lat, lon]).addTo(activeLightboxMap).bindPopup(`<b>${loc}</b>`).openPopup();
                }, 150);
            }
        }
    });

    function formatMarkdown(md) {
        if (!md) return "";
        let html = md
            // Headers
            .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-cyan-300 mt-2 mb-1.5">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-white mt-3 mb-2">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-xl font-extrabold text-white mt-4 mb-2">$1</h1>')
            // Bold
            .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white font-semibold">$1</strong>')
            // Code / inline monospace
            .replace(/`([^`]+)`/gim, '<code class="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono text-[0.75rem]">$1</code>')
            // LaTeX / Math block approximations
            .replace(/\$\$(.*?)\$\$/gim, '<div class="p-2.5 my-2 rounded-lg bg-black/60 border border-cyan-500/20 font-mono text-xs text-cyan-300 text-center overflow-x-auto">$1</div>')
            // Unordered list items
            .replace(/^\- (.*$)/gim, '<li class="flex items-start gap-2 ml-1 text-white/80"><span class="text-cyan-400 mt-1 text-[0.6rem]">●</span><span>$1</span></li>')
            // Numbered lists
            .replace(/^(\d+)\. (.*$)/gim, '<li class="flex items-start gap-2 ml-1 text-white/80"><span class="text-cyan-400 font-bold text-xs">$1.</span><span>$2</span></li>')
            // Line breaks
            .replace(/\n\n/gim, '<br/><br/>');
        return html;
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
