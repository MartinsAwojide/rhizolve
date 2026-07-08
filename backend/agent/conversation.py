from openai import AsyncOpenAI

from core.config import OPENROUTER_MODEL


class ConversationalAgent:
    def __init__(self, llm_client: AsyncOpenAI, graph=None):
        self.llm_client = llm_client
        self.graph = graph

    async def handle(self, message: str, mode: str) -> dict:
        if mode == "shallow":
            response = await self._shallow_answer(message)
            return {"response": response, "graph_invoked": False}

        if self.graph is not None:
            await self.graph.ainvoke({"message": message})
        return {"graph_invoked": True}

    async def _shallow_answer(self, message: str) -> str:
        completion = await self.llm_client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[{"role": "user", "content": message}],
        )
        return completion.choices[0].message.content or ""
