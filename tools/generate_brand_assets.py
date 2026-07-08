"""Generate brand SVG assets from DESIGN.md tokens (US-30 T03).

Assets are never hand-edited: DESIGN.md front matter is the single source of
truth, and this script re-emits docs/brand/*.svg from it. Run after any token
change; test_brand_assets.py fails CI if the two drift.

Usage:  python3 tools/generate_brand_assets.py
"""

from __future__ import annotations

from pathlib import Path

import frontmatter

REPO_ROOT = Path(__file__).resolve().parents[1]
BRAND_DIR = REPO_ROOT / "docs" / "brand"


def load() -> dict:
    return frontmatter.load(REPO_ROOT / "DESIGN.md").metadata["tokens"]


def node_marker_sheet(tokens: dict, mode: str) -> str:
    ns = {k: v[mode] for k, v in tokens["nodeStatus"].items()}
    surface = tokens["colors"]["surface-2"][mode]
    text = tokens["colors"]["text-secondary"][mode]
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 120" font-family="Inter, sans-serif">
  <title>Rhizolve node-status vocabulary — {mode} mode</title>
  <rect width="560" height="120" fill="{tokens['colors']['surface-0'][mode]}"/>

  <!-- active / confirmed: solid coral -->
  <circle cx="56" cy="44" r="16" fill="{ns['active']}"/>
  <text x="56" y="86" font-size="11" text-anchor="middle" fill="{text}">active</text>

  <!-- ruled out: hollow, grey outline, X -->
  <circle cx="160" cy="44" r="16" fill="{surface}" stroke="{ns['ruledOut']}" stroke-width="2.5"/>
  <path d="M152,36 L168,52 M168,36 L152,52" stroke="{tokens['colors']['danger'][mode]}" stroke-width="2.5"/>
  <text x="160" y="86" font-size="11" text-anchor="middle" fill="{text}">ruled out</text>

  <!-- root cause: green-plus outline -->
  <circle cx="264" cy="44" r="16" fill="{surface}" stroke="{ns['rootCause']}" stroke-width="2.5"/>
  <path d="M264,35 L264,53 M255,44 L273,44" stroke="{ns['rootCause']}" stroke-width="2.5"/>
  <text x="264" y="86" font-size="11" text-anchor="middle" fill="{text}">root cause</text>

  <!-- suspended: dashed blue outline -->
  <circle cx="368" cy="44" r="16" fill="{surface}" stroke="{ns['suspended']}" stroke-width="2.5" stroke-dasharray="5 4"/>
  <text x="368" y="86" font-size="11" text-anchor="middle" fill="{text}">suspended</text>

  <!-- conflict: split-colour donut -->
  <path d="M472,28 a16,16 0 0 1 0,32 Z" fill="{ns['conflict']}"/>
  <path d="M472,60 a16,16 0 0 1 0,-32 Z" fill="{ns['active']}"/>
  <circle cx="472" cy="44" r="7" fill="{surface}"/>
  <text x="472" y="86" font-size="11" text-anchor="middle" fill="{text}">conflict</text>
</svg>
"""


def logo(tokens: dict, mode: str) -> str:
    accent = tokens["colors"]["accent"][mode]
    coral = tokens["nodeStatus"]["active"][mode]
    connector = tokens["colors"]["text-muted"][mode]
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 96" font-family="Inter, sans-serif">
  <title>Rhizolve logo — {mode} mode</title>
  <!-- rhizome mark: root node branching orthogonally to a verified cause -->
  <circle cx="28" cy="26" r="11" fill="none" stroke="{accent}" stroke-width="3"/>
  <path d="M28,37 L28,58 L52,58 L52,70" fill="none" stroke="{connector}" stroke-width="2.5"/>
  <path d="M28,58 L14,58 L14,66" fill="none" stroke="{connector}" stroke-width="2.5"/>
  <circle cx="52" cy="74" r="7" fill="{coral}"/>
  <circle cx="14" cy="70" r="4" fill="none" stroke="{connector}" stroke-width="2"/>
  <text x="84" y="60" font-size="34" font-weight="500" fill="{tokens['colors']['text-primary'][mode]}">Rhizolve</text>
</svg>
"""


def main() -> None:
    tokens = load()
    BRAND_DIR.mkdir(parents=True, exist_ok=True)
    for mode in ("light", "dark"):
        (BRAND_DIR / f"node-status-{mode}.svg").write_text(node_marker_sheet(tokens, mode))
        (BRAND_DIR / f"logo-{mode}.svg").write_text(logo(tokens, mode))
    print(f"wrote 4 assets to {BRAND_DIR}")


if __name__ == "__main__":
    main()
