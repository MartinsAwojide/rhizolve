from core.llm import get_llm_client


def test_llm_client_has_a_bounded_timeout():
    client = get_llm_client()
    # The OpenAI SDK defaults to a 600s read timeout with no client-level
    # override, so a slow/degraded provider can hang a request for minutes
    # before openai.APITimeoutError is even raised (and only then does our
    # global exception handler get a chance to return a clean 503). A
    # short, explicit timeout bounds that.
    assert client.timeout == 30.0


def test_llm_client_disables_the_sdk_own_retries():
    client = get_llm_client()
    # Every call site (agent/graph.py, agent/extractor.py, agent/
    # conversation.py) already wraps its LLM call in a tenacity @retry on
    # APIConnectionError/RateLimitError/InternalServerError. The SDK's own
    # default max_retries=2 compounds with that (each tenacity attempt can
    # itself silently retry inside the SDK), multiplying worst-case latency
    # by ~3x for no benefit — tenacity is the single retry authority here.
    assert client.max_retries == 0
