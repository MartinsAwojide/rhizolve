import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.redis.aio import AsyncRedisSaver

from agent.graph import build_graph

_INTERRUPT_TYPES = {
    "gemba_dispatcher": "hypothesis_review",
    "gemba_check": "gemba_result_review",
    "why_generator": "validator_review",
    "countermeasure_generator": "validator_review",
    "report_generator": "countermeasure_review",
}


def _find_active_node(snapshot: Any) -> Any:
    active = snapshot.values.get("active_hypothesis")
    if active is None:
        return None
    return next(
        n
        for n in snapshot.values["why_nodes"]
        if n["branch_path"] == active["branch_path"]
    )


class FiveWhysAgent:
    def __init__(self, checkpointer: AsyncRedisSaver):
        self.graph = build_graph().compile(
            checkpointer=checkpointer,
            interrupt_before=["gemba_dispatcher", "gemba_check"],
            interrupt_after=["root_cause_validator", "countermeasure_generator"],
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

        node = _find_active_node(snapshot)
        if node is None:
            return await self._status(investigation_id)
        updated_node = {**node, "gemba_result": result, "gemba_notes": notes}
        await self.graph.aupdate_state(
            config, {"why_nodes": [updated_node]}, as_node="gemba_check"
        )
        await self.graph.ainvoke(None, config)
        return await self._status(investigation_id)

    async def submit_validator_review(
        self,
        investigation_id: str,
        user_override_root_cause: bool,
        user_probe_direction: str | None = None,
    ) -> dict[str, Any]:
        config = self._config(investigation_id)
        snapshot = await self.graph.aget_state(config)
        node = _find_active_node(snapshot)

        update: dict[str, Any] = {}
        if node is not None and user_override_root_cause:
            update["why_nodes"] = [{**node, "is_root_cause": True}]
        if user_probe_direction:
            existing = snapshot.values.get("domain_context", "")
            update["domain_context"] = f"{existing}\n{user_probe_direction}".strip()
        if update:
            await self.graph.aupdate_state(
                config, update, as_node="root_cause_validator"
            )

        await self.graph.ainvoke(None, config)
        return await self._status(investigation_id)

    async def submit_countermeasure_review(
        self,
        investigation_id: str,
        accepted: bool,
        edit: str | None = None,
        feedback: str | None = None,
    ) -> dict[str, Any]:
        config = self._config(investigation_id)
        snapshot = await self.graph.aget_state(config)
        node = _find_active_node(snapshot)

        if accepted:
            if edit and node is not None:
                await self.graph.aupdate_state(
                    config,
                    {"why_nodes": [{**node, "countermeasure": edit}]},
                    as_node="countermeasure_generator",
                )
        elif feedback:
            existing = snapshot.values.get("domain_context", "")
            appended = f"{existing}\nCountermeasure feedback: {feedback}".strip()
            await self.graph.aupdate_state(
                config, {"domain_context": appended}, as_node="root_cause_validator"
            )

        await self.graph.ainvoke(None, config)
        return await self._status(investigation_id)

    async def submit_hypothesis_review(
        self,
        investigation_id: str,
        hypotheses: list[dict[str, Any]] | None = None,
        regenerate_with_context: str | None = None,
    ) -> dict[str, Any]:
        config = self._config(investigation_id)
        snapshot = await self.graph.aget_state(config)

        if regenerate_with_context:
            existing = snapshot.values.get("domain_context", "")
            await self.graph.aupdate_state(
                config,
                {
                    "domain_context": (
                        f"{existing}\n{regenerate_with_context}".strip()
                    ),
                    "pending_hypotheses": [],
                },
                as_node="intake",
            )
        elif hypotheses is not None:
            await self.graph.aupdate_state(
                config, {"pending_hypotheses": hypotheses}, as_node="why_generator"
            )

        await self.graph.ainvoke(None, config)
        return await self._status(investigation_id)

    async def inject_context(self, thread_id: str, context: str) -> None:
        config: RunnableConfig = {"configurable": {"thread_id": thread_id}}
        snapshot = await self.graph.aget_state(config)
        existing = snapshot.values.get("domain_context", "")
        timestamp = datetime.now(timezone.utc).isoformat()
        appended = f"{existing}\n[{timestamp}] User: {context}".strip()
        await self.graph.aupdate_state(
            config, {"domain_context": appended}, as_node="intake"
        )

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
