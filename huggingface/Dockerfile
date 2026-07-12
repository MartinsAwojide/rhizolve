# Public POC deployment Dockerfile (see ADR-022). Build context is this
# `huggingface/` folder itself — matching what Hugging Face's Docker Space
# build actually sees after huggingface/hub-sync's `subdirectory: huggingface`
# sync (only this folder's contents reach the Space). Both `backend/` and
# `frontend/` here must contain the CI/locally-assembled real source
# (backend/{agent,core,models,api}, frontend/web) before building — see
# scripts/hf-poc-assemble.sh and .github/workflows/deploy-hf-poc.yml.
#
# Local build: `./scripts/hf-poc-assemble.sh && docker build -f huggingface/Dockerfile huggingface`

FROM node:22-slim AS frontend-builder
WORKDIR /build
RUN corepack enable && corepack prepare pnpm@11.10.0 --activate
COPY frontend/web/package.json frontend/web/pnpm-lock.yaml frontend/web/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/web/ ./
RUN pnpm build

FROM python:3.12-slim AS runtime

# Hugging Face Docker Spaces run as UID 1000 (huggingface.co/docs/hub/en/spaces-sdks-docker).
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH
WORKDIR $HOME/app
RUN chown user:user $HOME/app

RUN pip install --no-cache-dir --upgrade pip uv

COPY --chown=user backend/pyproject.toml backend/main.py ./
COPY --chown=user backend/agent ./agent
COPY --chown=user backend/core ./core
COPY --chown=user backend/models ./models
COPY --chown=user backend/api ./api
COPY --chown=user --from=frontend-builder /build/dist ./frontend/dist

USER user

RUN uv sync --no-dev

EXPOSE 7860
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
