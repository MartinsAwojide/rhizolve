**Button** — the primary chrome affordance (buttons, form submits, composer send). Use for any user action; blue accent only, never coral.

```jsx
<Button variant="primary" onClick={start}>Start investigation</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="ghost">Skip</Button>
```

Variants: `primary` (solid accent-fill), `secondary` (bordered surface), `ghost` (text-only accent), `danger` (outline red — destructive). Sizes: `sm` 32px · `md` 40px · `lg` 48px. Pass `leadingIcon`/`trailingIcon` for icons. `disabled` drops opacity to 0.45.
