**ValidatorReviewCard** — validator-decision interrupt. Shows whether a node is the confirmed root cause with a confidence meter and serif-voice rationale; the driver accepts or overrides.

```jsx
<ValidatorReviewCard
  decision="root_cause"
  confidence={0.82}
  rationale="Two independent Gemba checks confirm the seal wear; no deeper cause remains unexamined."
  onAccept={accept}
  onOverride={override}
/>
```
