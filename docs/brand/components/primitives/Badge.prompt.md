**Badge** — small pill for domain tags, counts, maturity level, compliance standards. Chrome tones only; node status never rides on a Badge.

```jsx
<Badge tone="neutral">Manufacturing</Badge>
<Badge tone="accent">ISO 9001</Badge>
<Badge tone="warning">Draft</Badge>
```

`tone`: neutral · accent · success · danger · warning. Tinted background + matching text/border via `color-mix`.
