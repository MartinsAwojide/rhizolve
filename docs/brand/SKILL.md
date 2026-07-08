---
name: rhizolve-design
description: Use this skill to generate well-branded interfaces and assets for Rhizolve — an AI-assisted 5 Whys root cause investigation platform — for production or throwaway prototypes/mocks. Contains design guidelines, colours (dual light/dark), type, fonts, brand assets, the node-status vocabulary, and UI kit components for the web and Android clients.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Load-bearing rules to never break:
- Light and dark are independently designed, equal-weight — never invert one to make the other.
- Chrome is blue; coral appears ONLY in the node-status vocabulary (why-tree, fault-tree, status dot). A coral element always means "confirmed or active cause," never a button.
- Two voices: Inter for UI chrome, Source Serif 4 for anything the AI authors. Sentence case everywhere. Two weights only (400, 500). No emoji in the product.
- The five node states (active/confirmed, ruled out, root cause, suspended, conflict) are the complete vocabulary — do not invent a sixth.

Key files: `readme.md` (full guide), `styles.css` + `tokens/` (link these), `assets/` (logos + node-status SVGs), `components/` (React primitives), `ui_kits/web` and `ui_kits/android` (full-screen recreations).
