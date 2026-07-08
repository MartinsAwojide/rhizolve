**GembaCheckCard** — the Gemba (field verification) interrupt. Evidence capture (Voice / Photo / Type) sits above three stacked ≥56dp result buttons carrying the node vocabulary: OK = hollow, NOK = solid coral, Root cause = green-plus. Docks inline in the chat thread; identical treatment on Android.

```jsx
<GembaCheckCard
  hypothesis="Worn conveyor seal on line 3"
  instructions="Inspect the seal at station 3. Photograph any visible wear."
  branch="3.1"
  onSubmit={({ result }) => submitGemba(result)}
/>
```
