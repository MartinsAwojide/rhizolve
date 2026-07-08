**Input** — text field / textarea for forms, project setup, and the chat composer. Hairline border, 8px radius, accent focus ring.

```jsx
<Input label="Phenomenon" placeholder="Describe what you observed" />
<Input as="textarea" label="Gemba notes" hint="What did you see on the floor?" />
<Input invalid hint="Required" />
```

`as`: input · textarea. `label`, `hint`, `invalid`, `leadingIcon` supported.
