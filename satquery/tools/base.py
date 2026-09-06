"""
Base classes and registry for SatQuery remote sensing tools.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ToolParameter(BaseModel):
    name: str
    type: str
    description: str
    required: bool = True
    default: Optional[Any] = None


class ToolDefinition(BaseModel):
    name: str
    description: str
    category: str
    parameters: List[ToolParameter]
    output_type: str


class BaseTool(ABC):
    name: str = ""
    description: str = ""
    category: str = "general"
    
    @abstractmethod
    def run(self, **kwargs) -> Dict[str, Any]:
        """Execute tool logic deterministically."""
        pass
    
    def get_definition(self) -> ToolDefinition:
        """Return structured tool metadata."""
        params = []
        for param_name, param_info in getattr(self, "parameters_schema", {}).items():
            params.append(ToolParameter(
                name=param_name,
                type=param_info.get("type", "string"),
                description=param_info.get("description", ""),
                required=param_info.get("required", True),
                default=param_info.get("default", None)
            ))
        return ToolDefinition(
            name=self.name,
            description=self.description,
            category=self.category,
            parameters=params,
            output_type=getattr(self, "output_type", "dict")
        )


class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        
    def register(self, tool: BaseTool):
        self._tools[tool.name] = tool
        
    def get(self, name: str) -> Optional[BaseTool]:
        return self._tools.get(name)
        
    def list_tools(self) -> List[ToolDefinition]:
        return [tool.get_definition() for tool in self._tools.values()]
        
    def execute(self, tool_name: str, **kwargs) -> Dict[str, Any]:
        tool = self.get(tool_name)
        if not tool:
            raise ValueError(f"Tool '{tool_name}' not found in registry.")
        return tool.run(**kwargs)


tool_registry = ToolRegistry()
