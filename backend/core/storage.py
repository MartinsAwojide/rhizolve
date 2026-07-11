import uuid
from pathlib import Path

from fastapi import UploadFile
from starlette.concurrency import run_in_threadpool

from core.config import ATTACHMENTS_DIR


class LocalAttachmentStorage:
    """Local-disk attachment storage. Swappable for GCS later behind this
    same interface — see ADR-013. No cloud dependency added this pass."""

    def __init__(self, base_dir: str = ATTACHMENTS_DIR):
        self._base = Path(base_dir)

    async def upload(self, investigation_id: str, file: UploadFile) -> tuple[str, str]:
        ext = Path(file.filename or "").suffix
        key = f"{investigation_id}/{uuid.uuid4()}{ext}"
        content = await file.read()
        await run_in_threadpool(self._write, key, content)
        return key, file.content_type or "application/octet-stream"

    def _write(self, key: str, content: bytes) -> None:
        dest = self._base / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(content)

    async def read(self, key: str) -> bytes:
        return await run_in_threadpool(self._read, key)

    def _read(self, key: str) -> bytes:
        return (self._base / key).read_bytes()

    def get_url(self, project_id: str, key: str) -> str:
        return f"/api/v1/projects/{project_id}/attachments/{key}"
