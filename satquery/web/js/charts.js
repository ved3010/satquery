/**
 * UI Metric Updates & Audit Modal Manager for SatQuery AI.
 */

function updateMetricsDisplay(synth, audit, latencyMs, stepsCount) {
    const metrics = synth.metrics || {};
    
    // Impact area
    document.getElementById('valImpactKm').innerText = (metrics.impact_area_sq_km || 0).toFixed(2);
    document.getElementById('valImpactHectares').innerText = `${(metrics.impact_area_hectares || 0).toLocaleString()} hectares`;
    document.getElementById('valImpactPct').innerText = (metrics.impact_percentage || 0).toFixed(1);
    document.getElementById('valTotalAoiKm').innerText = (metrics.total_study_area_sq_km || 0).toFixed(1);
    
    document.getElementById('valLatencyMs').innerText = latencyMs ? latencyMs.toFixed(0) : "0";
    document.getElementById('valStepCount').innerText = `${stepsCount || 0} tools executed`;

    // Impact title based on metric
    const metric = metrics.primary_metric || "NDVI";
    const lblMap = {
        "NDVI": "Deforestation Extent",
        "NDWI": "Water Body Contraction",
        "NDBI": "Urban Concrete Spread",
        "SAR_VV": "Flood Inundation Extent",
        "NBR": "Burn Scar Area"
    };
    document.getElementById('lblImpactTitle').innerText = lblMap[metric] || "Surface Area Shift";

    // Intelligence report
    document.getElementById('reportHeadline').innerText = synth.headline || "Synthesized Geospatial Intelligence";
    
    let html = `<p>${synth.headline}</p><ul>`;
    if (synth.findings && synth.findings.length > 0) {
        synth.findings.forEach(f => {
            // Replace markdown **bold** with HTML <strong>
            const parsed = f.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li>${parsed}</li>`;
        });
    }
    html += `</ul>`;
    if (synth.recommendation) {
        html += `<p style="margin-top: 10px; border-left: 2px solid var(--accent-cyan); padding-left: 8px;"><strong>💡 Recommendation:</strong> ${synth.recommendation}</p>`;
    }
    document.getElementById('reportContentText').innerHTML = html;

    // Populate Audit Modal
    if (audit) {
        document.getElementById('audId').innerText = audit.audit_id || "-";
        document.getElementById('audHash').innerText = audit.verification_hash || "-";
        document.getElementById('audProof').innerText = audit.math_proof || "-";
        document.getElementById('audCmd').innerText = audit.reproducibility_command || "-";
        document.getElementById('rawAuditJson').innerText = JSON.stringify(audit, null, 2);
    }
}

function initAuditModal() {
    const modal = document.getElementById('auditModal');
    const btnOpen = document.getElementById('btnOpenAudit');
    const btnClose = document.getElementById('btnCloseAudit');

    btnOpen.addEventListener('click', () => {
        modal.classList.add('open');
    });

    btnClose.addEventListener('click', () => {
        modal.classList.remove('open');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('open');
        }
    });
}
