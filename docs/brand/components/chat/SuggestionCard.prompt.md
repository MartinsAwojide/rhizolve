**SuggestionCard** — the AI Co-Pilot "staged suggestion" (DESIGN v0.2.0). The agent proposes an addition to the 5 Whys chain as a dashed-outline serif card next to the target node; the graph only changes once a human hits the primary blue "Accept suggestion" button. The AI never mutates the tree autonomously.

```jsx
<SuggestionCard
  targetNode="1.2"
  suggestion="Consider a lubricant-contamination branch — three prior line-3 investigations traced overheating to a bad grease batch."
  onAccept={acceptBranch}
  onDismiss={dismiss}
/>
```
