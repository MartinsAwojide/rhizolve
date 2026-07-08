**ProjectCard** — a project tile on the dashboard grid. Status dot (coral = active), domain badge, one-line description, maturity meter, active-investigation and member counts.

```jsx
<ProjectCard
  project={{ name: 'Line 3 seal failures', domain: 'Manufacturing', description: 'Recurring conveyor stoppages on the packaging line.', status: 'active', investigations: 2, maturity: 4, members: 5, visibility: 'Team' }}
  onClick={() => open(id)}
/>
```
