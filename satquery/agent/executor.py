"""
DAG Execution Engine with Intermediate Raster Rendering and Step Telemetry.
"""

import time
import io
import base64
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.cm as cm
from typing import Dict, Any, List, Optional
from satquery.tools.base import tool_registry
from satquery.agent.planner import ExecutionPlan, DAGNode


def array_to_png_base64(array: np.ndarray, colormap: str = "viridis", vmin: Optional[float] = None, vmax: Optional[float] = None) -> str:
    """Convert a 2D numpy array into a Base64-encoded PNG image for web map overlay."""
    norm_arr = np.nan_to_num(array, nan=0.0)
    if vmin is None:
        vmin = float(np.percentile(norm_arr, 2))
    if vmax is None:
        vmax = float(np.percentile(norm_arr, 98))
    if vmax <= vmin:
        vmax = vmin + 1e-5

    norm = plt.Normalize(vmin=vmin, vmax=vmax)
    cmap = getattr(cm, colormap, cm.viridis)
    colored = cmap(norm(norm_arr))
    
    # Convert RGBA 0-1 float to uint8
    img_uint8 = (colored * 255).astype(np.uint8)
    
    from PIL import Image
    img = Image.fromarray(img_uint8)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def bands_to_rgb_base64(red: np.ndarray, green: np.ndarray, blue: np.ndarray) -> str:
    """Combine 3 single-band arrays into True Color or False Color RGB Base64 PNG."""
    r = np.clip(np.nan_to_num(red) * 2.5 * 255, 0, 255).astype(np.uint8)
    g = np.clip(np.nan_to_num(green) * 2.5 * 255, 0, 255).astype(np.uint8)
    b = np.clip(np.nan_to_num(blue) * 2.5 * 255, 0, 255).astype(np.uint8)
    
    rgb = np.stack([r, g, b], axis=-1)
    from PIL import Image
    img = Image.fromarray(rgb)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


class StepResult:
    def __init__(self, node_id: str, tool: str, status: str, runtime_ms: float, output: Dict[str, Any], preview_image: Optional[str] = None):
        self.node_id = node_id
        self.tool = tool
        self.status = status
        self.runtime_ms = runtime_ms
        self.output = output
        self.preview_image = preview_image


class AgentExecutor:
    def execute(self, plan: ExecutionPlan) -> Dict[str, Any]:
        context: Dict[str, Any] = {}
        execution_trace: List[Dict[str, Any]] = []
        map_layers: Dict[str, Any] = {}
        zonal_summary: Dict[str, Any] = {}
        
        start_total = time.time()

        for node in plan.nodes:
            step_start = time.time()
            
            # Resolve inputs from context
            resolved_inputs = {}
            for k, v in node.inputs.items():
                if isinstance(v, str) and v.endswith("_ref") or k.endswith("_ref"):
                    param_name = k.replace("_ref", "")
                    # e.g. "cloud_mask_t1.cleaned_bands"
                    ref_path = v.split(".")
                    curr = context.get(ref_path[0], {})
                    for part in ref_path[1:]:
                        if isinstance(curr, dict):
                            curr = curr.get(part, {})
                        else:
                            curr = getattr(curr, part, {})
                    resolved_inputs[param_name] = curr
                else:
                    resolved_inputs[k] = v

            # Execute tool
            try:
                tool_output = tool_registry.execute(node.tool, **resolved_inputs)
                status = "SUCCESS"
            except Exception as e:
                tool_output = {"error": str(e)}
                status = "FAILED"

            runtime_ms = round((time.time() - step_start) * 1000.0, 2)
            context[node.id] = tool_output

            # Visual preview generation for UI Map
            preview_base64 = None
            if node.tool == "compute_spectral_index" and "grid" in tool_output:
                cmap = "Blues" if tool_output.get("index_type") == "NDWI" else ("RdYlGn" if tool_output.get("index_type") == "NDVI" else "viridis")
                preview_base64 = array_to_png_base64(tool_output["grid"], colormap=cmap, vmin=-0.2, vmax=0.8)
                layer_key = f"{tool_output.get('index_type', 'INDEX')}_{node.id}"
                map_layers[layer_key] = {
                    "title": f"{tool_output.get('label', 'Index')} ({node.id})",
                    "type": "raster",
                    "image_base64": preview_base64
                }
            elif node.tool == "detect_bitemporal_change" and "categorical_map" in tool_output:
                preview_base64 = array_to_png_base64(tool_output["categorical_map"], colormap="bwr", vmin=-1.0, vmax=1.0)
                map_layers["change_mask"] = {
                    "title": "Bi-Temporal Change Mask",
                    "type": "change_mask",
                    "image_base64": preview_base64,
                    "stats": tool_output.get("statistics")
                }
            elif node.tool == "search_and_fetch_stac_scene" and "bands" in tool_output:
                b = tool_output["bands"]
                if "B04" in b and "B03" in b and "B02" in b:
                    rgb_b64 = bands_to_rgb_base64(b["B04"], b["B03"], b["B02"])
                    cir_b64 = bands_to_rgb_base64(b["B08"], b["B04"], b["B03"])
                    map_layers[f"rgb_{node.id}"] = {"title": f"True Color RGB ({tool_output.get('year')})", "image_base64": rgb_b64}
                    map_layers[f"cir_{node.id}"] = {"title": f"Color Infrared (CIR - B8/B4/B3) ({tool_output.get('year')})", "image_base64": cir_b64}
                    preview_base64 = rgb_b64

            if node.tool == "compute_zonal_statistics":
                zonal_summary = tool_output

            # Sanitize numpy arrays from output before logging
            serializable_output = {}
            for out_k, out_v in tool_output.items():
                if isinstance(out_v, np.ndarray):
                    serializable_output[out_k] = f"<numpy.ndarray shape={out_v.shape} dtype={out_v.dtype}>"
                elif isinstance(out_v, dict):
                    serializable_output[out_k] = {
                        sub_k: (f"<ndarray shape={sub_v.shape}>" if isinstance(sub_v, np.ndarray) else sub_v)
                        for sub_k, sub_v in out_v.items()
                    }
                else:
                    serializable_output[out_k] = out_v

            execution_trace.append({
                "step_id": node.id,
                "tool": node.tool,
                "description": node.description,
                "status": status,
                "runtime_ms": runtime_ms,
                "output": serializable_output,
                "preview_image": preview_base64
            })

        total_latency_ms = round((time.time() - start_total) * 1000.0, 2)

        return {
            "total_latency_ms": total_latency_ms,
            "steps_count": len(plan.nodes),
            "execution_trace": execution_trace,
            "map_layers": map_layers,
            "zonal_summary": zonal_summary,
            "context": context
        }
