from openai import APIConnectionError, AsyncOpenAI, InternalServerError, RateLimitError
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from agent.schemas import ChatResponse
from core.config import OPENROUTER_MODEL


class ConversationalAgent:
    def __init__(self, llm_client: AsyncOpenAI, graph=None):
        self.llm_client = llm_client
        self.graph = graph

    async def handle(self, message: str, mode: str) -> ChatResponse:
        if mode == "shallow":
            response = await self._shallow_answer(message)
            return ChatResponse(response=response, graph_invoked=False)

        if self.graph is not None:
            await self.graph.ainvoke({"message": message})
        return ChatResponse(graph_invoked=True)

    @retry(
        retry=retry_if_exception_type(
            (APIConnectionError, RateLimitError, InternalServerError)
        ),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        stop=stop_after_attempt(3),
    )
    async def _shallow_answer(self, message: str) -> str:
        completion = await self.llm_client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[{"role": "user", "content": message}],
        )
        return completion.choices[0].message.content or ""
