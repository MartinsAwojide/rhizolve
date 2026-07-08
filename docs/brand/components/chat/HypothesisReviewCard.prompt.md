**HypothesisReviewCard** — hypothesis-review interrupt. The agent proposes ranked hypotheses (serif voice); the driver removes, reorders, and adds before generating Gemba checks.

```jsx
<HypothesisReviewCard
  hypotheses={[{ id: 'h1', text: 'Worn seal on line 3' }, { id: 'h2', text: 'Incorrect torque spec' }]}
  onConfirm={generateChecks}
  onRemove={removeHypothesis}
  onAdd={addHypothesis}
/>
```
