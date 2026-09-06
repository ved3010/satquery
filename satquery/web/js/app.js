/**
 * Main Application Controller for SatQuery AI.
 */

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initAuditModal();
    loadPresetScenarios();
    setupEventListeners();
});

let currentQueryJob = null;

function setupEventListeners() {
    const btnRun = document.getElementById('btnExecuteQuery');
    const inputQuery = document.getElementById('userQueryInput');

    btnRun.addEventListener('click', () => {
        const q = inputQuery.value.trim();
        if (q) {
            executeSatQuery(q);
        }
    });

    inputQuery.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            btnRun.click();
        }
    });

    // Tool registry button
    document.getElementById('btnOpenTools').addEventListener('click', () => {
        window.open('/api/tools', '_blank');
    });
}

async function loadPresetScenarios() {
    try {
        const resp = await fetch('/api/examples');
        const data = await resp.json();
        const container = document.getElementById('presetChipsContainer');
        container.innerHTML = '';

        data.presets.forEach(p => {
            const chip = document.createElement('div');
            chip.className = 'preset-chip';
            chip.innerHTML = `<span class="chip-tag">${p.metric}</span><strong>${p.title}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">${p.location}</span>`;
            chip.addEventListener('click', () => {
                document.getElementById('userQueryInput').value = p.query;
                executeSatQuery(p.query, p.id);
            });
            container.appendChild(chip);
        });
    } catch (err) {
        console.error("Failed to load presets", err);
    }
}

async function executeSatQuery(queryText, aoiKey = null) {
    const statusBadge = document.getElementById('agentStatusBadge');
    const timeline = document.getElementById('stepsTimeline');
    const metaRow = document.getElementById('dagMetaRow');

    statusBadge.className = 'status-pill running';
    statusBadge.innerText = 'EXECUTING DAG';
    timeline.innerHTML = '<div class="empty-state"><span class="empty-icon">⚙️</span><p>Decomposing query and compiling Earth Observation DAG...</p></div>';

    try {
        const resp = await fetch('/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: queryText, aoi: aoiKey })
        });

        if (!resp.ok) {
            throw new Error(`API Error: ${resp.statusText}`);
        }

        const data = await resp.json();
        currentQueryJob = data;

        // Update Metadata Row
        metaRow.style.display = 'flex';
        document.getElementById('metaDomain').innerText = data.intent;
        document.getElementById('metaSensor').innerText = data.sensor;
        document.getElementById('metaMetric').innerText = data.primary_metric;

        // Render DAG Steps in Timeline
        renderExecutionTimeline(data.execution_trace);

        // Update Map Layers
        const bbox = data.execution_trace[0]?.output?.bbox || [75.2, 13.8, 75.6, 14.2];
        updateMapLayers(data.map_layers, bbox);

        // Update Slider Labels
        if (data.temporal_range) {
            document.getElementById('lblT1').innerText = `Baseline (${data.temporal_range.t1})`;
            document.getElementById('lblT2').innerText = `Target (${data.temporal_range.t2})`;
        }

        // Update Metrics Shelf
        updateMetricsDisplay(data.synthesized_report, data.audit_record, data.total_latency_ms, data.execution_trace.length);

        statusBadge.className = 'status-pill success';
        statusBadge.innerText = 'COMPLETED';

    } catch (err) {
        console.error("Execution failed", err);
        statusBadge.className = 'status-pill idle';
        statusBadge.innerText = 'ERROR';
        timeline.innerHTML = `<div class="empty-state" style="color:var(--accent-crimson)"><p>Execution failed: ${err.message}</p></div>`;
    }
}

function renderExecutionTimeline(steps) {
    const timeline = document.getElementById('stepsTimeline');
    timeline.innerHTML = '';

    steps.forEach((step, idx) => {
        const item = document.createElement('div');
        item.className = 'timeline-step success';
        item.innerHTML = `
            <div class="step-header">
                <span class="step-tool">#${idx+1} ${step.tool}</span>
                <span class="step-time">${step.runtime_ms} ms</span>
            </div>
            <div class="step-desc">${step.description}</div>
        `;
        timeline.appendChild(item);
    });
}
