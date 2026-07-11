import io

import pytest
from fastapi import UploadFile

from core.storage import LocalAttachmentStorage


def _upload_file(filename: str, content: bytes = b"data") -> UploadFile:
    return UploadFile(filename=filename, file=io.BytesIO(content))


@pytest.mark.asyncio
async def test_upload_writes_file_and_returns_key(tmp_path):
    storage = LocalAttachmentStorage(base_dir=str(tmp_path))
    key, content_type = await storage.upload("inv-1", _upload_file("note.m4a"))

    assert key.startswith("inv-1/")
    assert key.endswith(".m4a")
    assert (tmp_path / key).exists()
    assert await storage.read(key) == b"data"


def test_get_url_produces_project_scoped_path():
    storage = LocalAttachmentStorage(base_dir="/tmp/unused")
    url = storage.get_url("proj-1", "inv-1/abc.m4a")
    assert url == "/api/v1/projects/proj-1/attachments/inv-1/abc.m4a"


@pytest.mark.asyncio
async def test_upload_generates_unique_key_for_same_filename(tmp_path):
    storage = LocalAttachmentStorage(base_dir=str(tmp_path))
    key1, _ = await storage.upload("inv-1", _upload_file("note.m4a"))
    key2, _ = await storage.upload("inv-1", _upload_file("note.m4a"))
    assert key1 != key2


@pytest.mark.asyncio
async def test_upload_filename_cannot_escape_attachments_dir(tmp_path):
    storage = LocalAttachmentStorage(base_dir=str(tmp_path))
    key, _ = await storage.upload("inv-1", _upload_file("../../etc/passwd"))

    resolved = (tmp_path / key).resolve()
    assert resolved.is_relative_to(tmp_path.resolve())
