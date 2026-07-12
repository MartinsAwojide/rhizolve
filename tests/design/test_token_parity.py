"""Token-parity contract test (US-30a).

Single source of truth: DESIGN.md YAML front matter.
Three layers, activating as the project grows:

1. Structural + contrast checks against DESIGN.md alone — run from SP00.
2. Web half (tailwind config) — auto-skips until frontend/web exists (SP07).
3. Android half (values/ + values-night/) — auto-skips until SP13.

WCAG bars (project decision: AA, not AAA):
  - normal text 4.5:1, large text 3:1 (WCAG 1.4.3)
  - non-text UI graphics (node markers) 3:1 (WCAG 1.4.11)
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import frontmatter
import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
DESIGN_MD = REPO_ROOT / "DESIGN.md"
TAILWIND_CONFIG = REPO_ROOT / "frontend" / "web" / "tailwind.config.ts"
ANDROID_COLORS = REPO_ROOT / "mobile" / "android" / "app" / "src" / "main" / "res" / "values" / "colors.xml"
ANDROID_COLORS_NIGHT = REPO_ROOT / "mobile" / "android" / "app" / "src" / "main" / "res" / "values-night" / "colors.xml"

AA_NORMAL = 4.5
AA_GRAPHIC = 3.0

# Text tokens paired with the surface they are specified against.
TEXT_ON_SURFACE = [
    ("text-primary", "surface-0"),
    ("text-secondary", "surface-0"),
    ("text-muted", "surface-0"),
    ("accent", "surface-0"),
]
FILL_PAIRS = [("on-accent", "accent-fill")]
SEMANTIC_ON_SURFACE = ["success", "danger", "warning"]


def load_tokens() -> dict:
    post = frontmatter.load(DESIGN_MD)
    return post.metadata["tokens"]


def _srgb_channel(c: float) -> float:
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def relative_luminance(hex_color: str) -> float:
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))
    return 0.2126 * _srgb_channel(r) + 0.7152 * _srgb_channel(g) + 0.0722 * _srgb_channel(b)


def contrast_ratio(fg: str, bg: str) -> float:
    la, lb = relative_luminance(fg), relative_luminance(bg)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


# ---------------------------------------------------------------------------
# Layer 1 — DESIGN.md alone (runs from SP00)
# ---------------------------------------------------------------------------

HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def test_design_md_exists_at_repo_root():
    assert DESIGN_MD.exists(), "DESIGN.md is the token source of truth and must live at repo root"


def test_every_color_token_has_both_modes_defined():
    tokens = load_tokens()
    for group in ("colors", "nodeStatus", "projectStatus"):
        for name, value in tokens[group].items():
            assert isinstance(value, dict), f"{group}.{name} must be a light/dark mapping, not a flat value"
            assert "light" in value and "dark" in value, f"{group}.{name} missing a mode"


def test_every_color_value_is_valid_hex():
    tokens = load_tokens()
    for group in ("colors", "nodeStatus", "projectStatus"):
        for name, value in tokens[group].items():
            for mode in ("light", "dark"):
                assert HEX_RE.match(value[mode]), f"{group}.{name}.{mode} = {value[mode]!r} is not #RRGGBB"


@pytest.mark.parametrize("mode", ["light", "dark"])
def test_text_tokens_clear_aa_normal(mode):
    tokens = load_tokens()
    for text_token, surface_token in TEXT_ON_SURFACE:
        fg = tokens["colors"][text_token][mode]
        bg = tokens["colors"][surface_token][mode]
        ratio = contrast_ratio(fg, bg)
        assert ratio >= AA_NORMAL, (
            f"{text_token} on {surface_token} ({mode}) = {ratio:.2f}:1 — below AA normal {AA_NORMAL}:1"
        )


@pytest.mark.parametrize("mode", ["light", "dark"])
def test_fill_pairs_clear_aa_normal(mode):
    tokens = load_tokens()
    for fg_token, bg_token in FILL_PAIRS:
        ratio = contrast_ratio(tokens["colors"][fg_token][mode], tokens["colors"][bg_token][mode])
        assert ratio >= AA_NORMAL, f"{fg_token} on {bg_token} ({mode}) = {ratio:.2f}:1"


@pytest.mark.parametrize("mode", ["light", "dark"])
def test_semantic_colors_clear_aa_normal_on_surface(mode):
    tokens = load_tokens()
    bg = tokens["colors"]["surface-0"][mode]
    for name in SEMANTIC_ON_SURFACE:
        ratio = contrast_ratio(tokens["colors"][name][mode], bg)
        assert ratio >= AA_NORMAL, f"{name} on surface-0 ({mode}) = {ratio:.2f}:1"


@pytest.mark.parametrize("mode", ["light", "dark"])
def test_node_status_markers_clear_non_text_contrast(mode):
    """Node markers are UI graphics — WCAG 1.4.11 requires 3:1 against adjacent surface."""
    tokens = load_tokens()
    for surface_token in ("surface-0", "surface-2"):
        bg = tokens["colors"][surface_token][mode]
        for name, value in tokens["nodeStatus"].items():
            ratio = contrast_ratio(value[mode], bg)
            assert ratio >= AA_GRAPHIC, (
                f"nodeStatus.{name} on {surface_token} ({mode}) = {ratio:.2f}:1 — below 3:1 (WCAG 1.4.11)"
            )


@pytest.mark.parametrize("mode", ["light", "dark"])
def test_project_status_markers_clear_non_text_contrast(mode):
    """ProjectCard status dots are UI graphics — WCAG 1.4.11 requires 3:1."""
    tokens = load_tokens()
    for surface_token in ("surface-0", "surface-2"):
        bg = tokens["colors"][surface_token][mode]
        for name, value in tokens["projectStatus"].items():
            ratio = contrast_ratio(value[mode], bg)
            assert ratio >= AA_GRAPHIC, (
                f"projectStatus.{name} on {surface_token} ({mode}) = {ratio:.2f}:1 — below 3:1 (WCAG 1.4.11)"
            )


def test_coral_is_confined_to_node_status():
    """Design principle: coral is investigation-state only, never UI chrome.

    The active/confirmed coral hue must not appear anywhere in `colors`
    (chrome tokens) — if it does, the chrome/semantics separation has leaked.
    """
    tokens = load_tokens()
    coral_values = {
        tokens["nodeStatus"]["active"][m].lower() for m in ("light", "dark")
    }
    for name, value in tokens["colors"].items():
        for mode in ("light", "dark"):
            assert value[mode].lower() not in coral_values, (
                f"colors.{name}.{mode} reuses the node-status coral — chrome must stay blue"
            )


# ---------------------------------------------------------------------------
# Layer 2 — web half (activates at SP07)
# ---------------------------------------------------------------------------

@pytest.mark.skipif(not TAILWIND_CONFIG.exists(), reason="frontend not created yet (SP07)")
@pytest.mark.parametrize("mode", ["light", "dark"])
def test_web_tokens_match_design_md(mode):
    tokens = load_tokens()
    config_text = TAILWIND_CONFIG.read_text()
    for name, value in tokens["colors"].items():
        assert value[mode].lower() in config_text.lower(), (
            f"tailwind.config.ts missing colors.{name}.{mode} = {value[mode]}"
        )


# ---------------------------------------------------------------------------
# Layer 3 — Android half (activates at SP13)
# ---------------------------------------------------------------------------

def _parse_android_colors(path: Path) -> dict[str, str]:
    import xml.etree.ElementTree as ET

    root = ET.parse(path).getroot()
    return {el.get("name"): el.text.strip().upper() for el in root.iter("color")}


@pytest.mark.skipif(not ANDROID_COLORS.exists(), reason="Android theme not created yet (SP13)")
def test_android_light_tokens_match_design_md():
    tokens = load_tokens()
    android = _parse_android_colors(ANDROID_COLORS)
    for name, value in tokens["colors"].items():
        key = "color_" + name.replace("-", "_")
        assert android.get(key) == value["light"].upper(), f"{key} != colors.{name}.light"


@pytest.mark.skipif(not ANDROID_COLORS_NIGHT.exists(), reason="values-night not created yet (SP13)")
def test_android_dark_tokens_match_design_md():
    tokens = load_tokens()
    android = _parse_android_colors(ANDROID_COLORS_NIGHT)
    for name, value in tokens["colors"].items():
        key = "color_" + name.replace("-", "_")
        assert android.get(key) == value["dark"].upper(), f"{key} != colors.{name}.dark"


if __name__ == "__main__":
    raise SystemExit(json.dumps({"hint": "run with pytest"}))
