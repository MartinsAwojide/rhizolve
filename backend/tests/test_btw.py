from agent.btw import is_btw, resolve_thread, strip_btw_prefix


def test_is_btw_detects_prefix():
    assert is_btw("/btw what is FMEA?") is True
    assert is_btw("what is FMEA?") is False


def test_strip_btw_prefix_removes_prefix_and_whitespace():
    assert strip_btw_prefix("/btw   what is FMEA?") == "what is FMEA?"


def test_resolve_thread_creates_ephemeral_thread_for_btw():
    thread_id, ephemeral = resolve_thread("/btw what is FMEA?", "main-001")
    assert thread_id != "main-001"
    assert ephemeral is True


def test_resolve_thread_keeps_main_thread_for_normal_message():
    thread_id, ephemeral = resolve_thread("why do trucks hit the wall", "main-001")
    assert thread_id == "main-001"
    assert ephemeral is False
