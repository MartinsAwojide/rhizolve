**NodeStatusMarker** — the five-state node vocabulary of the why-tree and fault-tree. This is Rhizolve's signature; it is the only place coral appears. Use it in the tree, the report fault-tree, and Android Gemba buttons — never as a generic UI dot for chrome.

```jsx
<NodeStatusMarker status="active" size={32} />
<NodeStatusMarker status="confirmed" />
<NodeStatusMarker status="ruledOut" emphaticRuledOut />
<NodeStatusMarker status="rootCause" />
<NodeStatusMarker status="suspended" />
<NodeStatusMarker status="conflict" />
```

`status`: active (solid coral ring, surface fill — under review) · confirmed (solid coral fill — Gemba NOK) · ruledOut (grey outline, faded to 50%; `emphaticRuledOut` adds red-X) · rootCause (green outline + subtle teal fill + green-plus) · suspended (dashed blue) · conflict (split donut). `size` encodes depth/importance.
