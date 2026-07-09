import uuid
from typing import Any, Literal

from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.redis.aio import AsyncRedisSaver

from agent.graph import build_graph

_INTERRUPT_TYPES = {
    "gemba_dispatcher": "hypothesis_review",
    "gemba_check": "gemba_result_review",
}


class FiveWhysAgent:
    def __init__(self, checkpointer: AsyncRedisSaver):
        self.graph = build_graph().compile(
            checkpointer=checkpointer,
            interrupt_before=["gemba_dispatcher", "gemba_check"],
        )
        self._project_ids: dict[str, str] = {}

    def _config(self, investigation_id: str) -> RunnableConfig:
        project_id = self._project_ids[investigation_id]
        return {"configurable": {"thread_id": f"{project_id}:{investigation_id}"}}

    async def start_investigation(
        self,
        phenomenon: str,
        domain: str,
        system_or_process_context: str,
        project_id: str = "default",
        max_depth: int = 5,
    ) -> dict[str, Any]:
        investigation_id = str(uuid.uuid4())
        self._project_ids[investigation_id] = project_id
        config = self._config(investigation_id)
        await self.graph.ainvoke(
            {
                "investigation_id": investigation_id,
                "project_id": project_id,
                "phenomenon": phenomenon,
                "domain": domain,
                "system_or_process_context": system_or_process_context,
                "max_depth": max_depth,
                "current_depth": 0,
                "current_branch_path": "root",
                "why_nodes": [],
                "pending_hypotheses": [],
            },
            config,
        )
        return await self._status(investigation_id)

    async def submit_gemba(
        self, investigation_id: str, result: Literal["OK", "NOK"], notes: str = ""
    ) -> dict[str, Any]:
        config = self._config(investigation_id)
        snapshot = await self.graph.aget_state(config)
        if snapshot.next == ("gemba_dispatcher",):
            await self.graph.ainvoke(None, config)
            snapshot = await self.graph.aget_state(config)

        active = snapshot.values.get("active_hypothesis")
        if active is None:
            return await self._status(investigation_id)
        node = next(
            n
            for n in snapshot.values["why_nodes"]
            if n["branch_path"] == active["branch_path"]
        )
        updated_node = {**node, "gemba_result": result, "gemba_notes": notes}
        await self.graph.aupdate_state(
            config, {"why_nodes": [updated_node]}, as_node="gemba_check"
        )
        await self.graph.ainvoke(None, config)
        return await self._status(investigation_id)

    async def _status(self, investigation_id: str) -> dict[str, Any]:
        config = self._config(investigation_id)
        snapshot = await self.graph.aget_state(config)
        if not snapshot.next:
            return {
                "investigation_id": investigation_id,
                "status": "complete",
                "interrupt_type": None,
            }
        interrupt_type = _INTERRUPT_TYPES.get(snapshot.next[0])
        return {
            "investigation_id": investigation_id,
            "status": "awaiting_gemba",
            "interrupt_type": interrupt_type,
        }
