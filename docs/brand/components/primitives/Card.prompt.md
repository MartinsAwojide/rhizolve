**Card** — the raised container behind project cards, chat interrupt cards, and dashboard panels. Surface-2, 12px radius, hairline border, soft shadow. Pair with `CardHeader` for a titled row.

```jsx
<Card elevation="md">
  <CardHeader title="Hypothesis review" meta={<Badge>3 candidates</Badge>} />
  …card body…
</Card>
```

`elevation`: flat · sm · md · lg. `padded={false}` for edge-to-edge media. Chat interrupt cards (Hypothesis/Gemba/Validator/Countermeasure) all build on this.
