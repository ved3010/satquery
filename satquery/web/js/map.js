/**
 * Leaflet Geospatial Map Controller for SatQuery AI.
 */

let mapInstance = null;
let currentLayerOverlays = {};
let activeLayerKey = "change";
let currentBounds = [[13.80, 75.20], [14.20, 75.60]]; // Western Ghats Default

function initMap() {
    // Initialize map with Dark theme base tiles
    mapInstance = L.map('satMap', {
        center: [14.00, 75.40],
        zoom: 11,
        zoomControl: true
    });

    // Dark Matter base map tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(mapInstance);

    // Zoom AOI Button
    document.getElementById('btnResetView').addEventListener('click', () => {
        if (currentBounds) {
            mapInstance.fitBounds(currentBounds);
        }
    });

    // Opacity slider listener
    const slider = document.getElementById('opacitySlider');
    slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100.0;
        updateActiveLayerOpacity(val);
    });

    // Layer toggle buttons
    const toggles = document.querySelectorAll('.toggle-btn');
    toggles.forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggles.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const mode = e.target.getAttribute('data-layer');
            switchActiveLayer(mode);
        });
    });
}

function updateMapLayers(layers, bbox) {
    if (!mapInstance) return;

    // Remove existing image overlays
    Object.values(currentLayerOverlays).forEach(overlay => {
        if (mapInstance.hasLayer(overlay)) {
            mapInstance.removeLayer(overlay);
        }
    });
    currentLayerOverlays = {};

    // bbox: [min_lon, min_lat, max_lon, max_lat] -> Leaflet LatLngBounds: [[min_lat, min_lon], [max_lat, max_lon]]
    if (bbox && bbox.length === 4) {
        currentBounds = [
            [bbox[1], bbox[0]],
            [bbox[3], bbox[2]]
        ];
        mapInstance.fitBounds(currentBounds, { padding: [20, 20] });
    }

    // Add Change Mask overlay
    if (layers.change_mask && layers.change_mask.image_base64) {
        const url = `data:image/png;base64,${layers.change_mask.image_base64}`;
        currentLayerOverlays['change'] = L.imageOverlay(url, currentBounds, { opacity: 0.85 });
    }

    // Add RGB overlay
    const rgbKey = Object.keys(layers).find(k => k.startsWith('rgb_'));
    if (rgbKey && layers[rgbKey].image_base64) {
        const url = `data:image/png;base64,${layers[rgbKey].image_base64}`;
        currentLayerOverlays['rgb'] = L.imageOverlay(url, currentBounds, { opacity: 0.95 });
    }

    // Add CIR overlay
    const cirKey = Object.keys(layers).find(k => k.startsWith('cir_'));
    if (cirKey && layers[cirKey].image_base64) {
        const url = `data:image/png;base64,${layers[cirKey].image_base64}`;
        currentLayerOverlays['cir'] = L.imageOverlay(url, currentBounds, { opacity: 0.95 });
    }

    // Add Spectral Index overlay
    const indexKey = Object.keys(layers).find(k => k.startsWith('NDVI_') || k.startsWith('NDWI_') || k.startsWith('NDBI_') || k.startsWith('NBR_'));
    if (indexKey && layers[indexKey].image_base64) {
        const url = `data:image/png;base64,${layers[indexKey].image_base64}`;
        currentLayerOverlays['index'] = L.imageOverlay(url, currentBounds, { opacity: 0.90 });
    }

    // Activate default layer
    switchActiveLayer(activeLayerKey);
}

function switchActiveLayer(mode) {
    activeLayerKey = mode;
    Object.keys(currentLayerOverlays).forEach(key => {
        const layer = currentLayerOverlays[key];
        if (key === mode) {
            if (!mapInstance.hasLayer(layer)) {
                layer.addTo(mapInstance);
            }
        } else {
            if (mapInstance.hasLayer(layer)) {
                mapInstance.removeLayer(layer);
            }
        }
    });

    // Update legend
    const legendTitle = document.getElementById('legendTitle');
    const legendItems = document.getElementById('legendItems');

    if (mode === 'change') {
        legendTitle.innerText = "Bi-Temporal Change Mask";
        legendItems.innerHTML = `
            <div class="legend-row"><span class="color-box loss"></span> Significant Loss / Depletion (-1)</div>
            <div class="legend-row"><span class="color-box stable"></span> Stable Unchanged (0)</div>
            <div class="legend-row"><span class="color-box gain"></span> New Growth / Expansion (+1)</div>
        `;
    } else if (mode === 'rgb') {
        legendTitle.innerText = "Sentinel-2 True Color (RGB)";
        legendItems.innerHTML = `
            <div class="legend-row"><span>🔴 B04 (Red)</span></div>
            <div class="legend-row"><span>🟢 B03 (Green)</span></div>
            <div class="legend-row"><span>🔵 B02 (Blue)</span></div>
        `;
    } else if (mode === 'cir') {
        legendTitle.innerText = "Color Infrared Composite (CIR)";
        legendItems.innerHTML = `
            <div class="legend-row"><span style="color:#f43f5e">■ Bright Red: Vigorous Canopy / NIR</span></div>
            <div class="legend-row"><span style="color:#94a3b8">■ Grey/Cyan: Built-up / Bare Soil</span></div>
            <div class="legend-row"><span style="color:#38bdf8">■ Dark Blue: Clear Water</span></div>
        `;
    } else if (mode === 'index') {
        legendTitle.innerText = "Spectral Biophysical Heatmap";
        legendItems.innerHTML = `
            <div class="legend-row"><span style="color:#10b981">■ High Values (> 0.6)</span></div>
            <div class="legend-row"><span style="color:#f59e0b">■ Moderate (0.2 - 0.5)</span></div>
            <div class="legend-row"><span style="color:#ef4444">■ Low / Negative (< 0.1)</span></div>
        `;
    }
}

function updateActiveLayerOpacity(val) {
    const activeLayer = currentLayerOverlays[activeLayerKey];
    if (activeLayer && activeLayer.setOpacity) {
        activeLayer.setOpacity(val);
    }
}
