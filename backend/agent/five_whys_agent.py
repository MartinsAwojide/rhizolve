import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.redis.aio import AsyncRedisSaver
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from agent.graph import Attachment, WhyNode, build_graph
from agent.tree_navigation import hard_reset, soft_reset
from core.conflict import detect_conflict
from core.pubsub import RedisPubSub, make_channel
from models.investigation import Investigation, InvestigationStatus

_INTERRUPT_TYPES = {
    "gemba_dispatcher": "hypothesis_review",
    "gemba_check": "gemba_result_review",
    "why_generator": "validator_review",
    "countermeasure_generator": "validator_review",
    "report_generator": "countermeasure_review",
}

_QUORUM_INTERRUPT_TYPES = {"hypothesis_review", "validator_review", "countermeasure_review"}


def _find_active_node(snapshot: Any) -> Any:
    active = snapshot.values.get("active_hypothesis")
    if active is None:
        return None
    return next(
        n
        for n in snapshot.values["why_nodes"]
        if n["branch_path"] == active["branch_path"]
    )


def _why_nodes_to_tree(why_nodes: list[WhyNode]) -> dict[str, WhyNode]:
    return {n["branch_path"]: n for n in why_nodes}


def _tree_to_why_nodes(tree: dict[str, WhyNode]) -> list[WhyNode]:
    return list(tree.values())


class FiveWhysAgent:
    def __init__(
        self,
        checkpointer: AsyncRedisSaver,
        pubsub: RedisPubSub | None = None,
        db_sessionmaker: async_sessionmaker[AsyncSession] | None = None,
    ):
        self.graph = build_graph().compile(
            checkpointer=checkpointer,
            interrupt_before=["gemba_dispatcher", "gemba_check"],
            interrupt_after=["root_cause_validator", "countermeasure_generator"],
        )
        self._project_ids: dict[str, str] = {}
        self._pubsub = pubsub
        self._db_sessionmaker = db_sessionmaker

    async def _resolve_project_id(self, investigation_id: str) -> str:
        if investigation_id in self._project_ids:
            return self._project_ids[investigation_id]
        if self._db_sessionmaker is None:
            raise KeyError(investigation_id)
        async with self._db_sessionmaker() as session:
            investigation = await session.get(Investigation, investigation_id)
        if investigation is None:
            raise KeyError(investigation_id)
        self._project_ids[investigation_id] = investigation.project_id
        return investigation.project_id

    async def _config(self, investigation_id: str) -> RunnableConfig:
        project_id = await self._resolve_project_id(investigation_id)
        return {"configurable": {"thread_id": f"{project_id}:{investigation_id}"}}

    async def _run_and_publish(
        self, config: RunnableConfig, investigation_id: str, input_state: Any = None
    ) -> None:
        project_id = await self._resolve_project_id(investigation_id)
        async for chunk in self.graph.astream(
            input_state, config, stream_mode="updates"
        ):
            if self._pubsub is None:
                continue
            for node_name, partial in chunk.items():
                payload: dict[str, Any] = {
                    "node": node_name,
                    "investigation_id": investigation_id,
                }
                if isinstance(partial, dict) and "why_nodes" in partial:
                    payload["updated_nodes"] = partial["why_nodes"]
                await self._pubsub.publish(
                    make_channel(project_id, investigation_id),
                    "node_update",
                    payload,
                )

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
        config = await self._config(investigation_id)
        await self._run_and_publish(
            config,
            investigation_id,
            input_state={
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
        )
        return await self._status(investigation_id)

    async def submit_gemba(
        self,
        investigation_id: str,
        result: Literal["OK", "NOK", "ROOT_CAUSE"],
        notes: str = "",
        attachments: list[Attachment] | None = None,
    ) -> dict[str, Any]:
        config = await self._config(investigation_id)
        snapshot = await self.graph.aget_state(config)
        if snapshot.next == ("gemba_dispatcher",):
            await self._run_and_publish(config, investigation_id)
            snapshot = await self.graph.aget_state(config)

        node = _find_active_node(snapshot)
        if node is None:
            return await self._status(investigation_id)

        if detect_conflict(
            {"branch_path": node["branch_path"], "result": result},
            snapshot.values["why_nodes"],
        ):
            return {
                "conflict": True,
                "branch_path": node["branch_path"],
                "existing_result": node["gemba_result"],
                "incoming_result": result,
                "incoming_notes": notes,
            }

        updated_node = {
            **node,
            "gemba_result": result,
            "gemba_notes": notes,
            "attachments": (
                attachments if attachments is not None else node.get("attachments", [])
            ),
        }
        await self.graph.aupdate_state(
            config, {"why_nodes": [updated_node]}, as_node="gemba_check"
        )
        await self._run_and_publish(config, investigation_id)
        return await self._status(investigation_id)

    async def submit_validator_review(
        self,
        investigation_id: str,
        user_override_root_cause: bool,
        user_probe_direction: str | None = None,
    ) -> dict[str, Any]:
        config = await self._config(investigation_id)
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

        await self._run_and_publish(config, investigation_id)
        return await self._status(investigation_id)

    async def submit_countermeasure_review(
        self,
        investigation_id: str,
        accepted: bool,
        edit: str | None = None,
        feedback: str | None = None,
    ) -> dict[str, Any]:
        config = await self._config(investigation_id)
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

        await self._run_and_publish(config, investigation_id)
        return await self._status(investigation_id)

    async def submit_hypothesis_review(
        self,
        investigation_id: str,
        hypotheses: list[dict[str, Any]] | None = None,
        regenerate_with_context: str | None = None,
    ) -> dict[str, Any]:
        config = await self._config(investigation_id)
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

        await self._run_and_publish(config, investigation_id)
        return await self._status(investigation_id)

    async def reset_tree(
        self,
        investigation_id: str,
        branch_path: str,
        reset_type: Literal["soft", "hard"],
    ) -> dict[str, Any]:
        config = await self._config(investigation_id)
        snapshot = await self.graph.aget_state(config)
        tree = _why_nodes_to_tree(snapshot.values["why_nodes"])
        reset_fn = soft_reset if reset_type == "soft" else hard_reset
        updated_tree = reset_fn(tree, branch_path)
        target_node = tree.get(branch_path)
        update: dict[str, Any] = {
            "why_nodes": _tree_to_why_nodes(updated_tree),
            "current_branch_path": branch_path,
        }
        if target_node is not None:
            update["current_depth"] = target_node["depth"]
        await self.graph.aupdate_state(
            config,
            update,
            as_node="root_cause_validator",
        )
        return await self._status(investigation_id)

    async def get_tree(self, investigation_id: str) -> list[WhyNode]:
        config = await self._config(investigation_id)
        snapshot = await self.graph.aget_state(config)
        return snapshot.values.get("why_nodes", [])

    async def inject_context(self, thread_id: str, context: str) -> None:
        config: RunnableConfig = {"configurable": {"thread_id": thread_id}}
        snapshot = await self.graph.aget_state(config)
        existing = snapshot.values.get("domain_context", "")
        timestamp = datetime.now(timezone.utc).isoformat()
        appended = f"{existing}\n[{timestamp}] User: {context}".strip()
        await self.graph.aupdate_state(
            config, {"domain_context": appended}, as_node="intake"
        )

    async def get_status(self, investigation_id: str) -> dict[str, Any]:
        return await self._status(investigation_id)

    async def _status(self, investigation_id: str) -> dict[str, Any]:
        config = await self._config(investigation_id)
        snapshot = await self.graph.aget_state(config)
        if snapshot.next and _INTERRUPT_TYPES.get(snapshot.next[0]) is None:
            # snapshot.next points at a node that isn't a user-facing
            # interrupt point, meaning it crashed mid-execution (e.g. a
            # transient LLM/provider failure) and never advanced. Retry it
            # rather than permanently reporting no interrupt_type with no
            # way for the investigation to recover.
            await self._run_and_publish(config, investigation_id)
            snapshot = await self.graph.aget_state(config)
        if not snapshot.next:
            result = {
                "investigation_id": investigation_id,
                "status": "complete",
                "interrupt_type": None,
                "pending_hypotheses": [],
                "node": None,
            }
        else:
            interrupt_type = _INTERRUPT_TYPES.get(snapshot.next[0])
            result = {
                "investigation_id": investigation_id,
                "status": "awaiting_gemba",
                "interrupt_type": interrupt_type,
                "pending_hypotheses": (
                    snapshot.values.get("pending_hypotheses", [])
                    if interrupt_type == "hypothesis_review"
                    else []
                ),
                "node": (
                    _find_active_node(snapshot)
                    if interrupt_type != "hypothesis_review"
                    else None
                ),
            }

        if self._db_sessionmaker is not None:
            await self._sync_investigation_row(investigation_id, snapshot, result)

        return result

    async def _sync_investigation_row(
        self, investigation_id: str, snapshot: Any, status_result: dict[str, Any]
    ) -> None:
        why_nodes = snapshot.values.get("why_nodes", [])
        values = {
            "id": investigation_id,
            "project_id": self._project_ids[investigation_id],
            "status": (
                InvestigationStatus.COMPLETE
                if status_result["status"] == "complete"
                else InvestigationStatus.AWAITING_GEMBA
            ),
            "interrupt_type": status_result["interrupt_type"],
            "current_depth": snapshot.values.get("current_depth", 0),
            "root_cause_found": any(n.get("is_root_cause") for n in why_nodes),
            "node_count": len(why_nodes),
            "node_pending_count": sum(
                1 for n in why_nodes if n.get("gemba_result") == "pending"
            ),
            "awaiting_quorum": status_result["interrupt_type"]
            in _QUORUM_INTERRUPT_TYPES,
        }
        stmt = pg_insert(Investigation).values(**values)
        stmt = stmt.on_conflict_do_update(
            index_elements=[Investigation.id],
            set_={k: v for k, v in values.items() if k != "id"},
        )
        assert self._db_sessionmaker is not None
        async with self._db_sessionmaker() as session:
            await session.execute(stmt)
            await session.commit()
