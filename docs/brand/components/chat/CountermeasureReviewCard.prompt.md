**CountermeasureReviewCard** — countermeasure-review interrupt. Shows the confirmed root cause and the AI-drafted corrective action (serif voice); the driver accepts, edits, or rejects.

```jsx
<CountermeasureReviewCard
  rootCause="Worn conveyor seal, line 3"
  countermeasure="Replace the seal and add a monthly wear inspection to the preventive-maintenance schedule."
  onAccept={accept} onEdit={edit} onReject={reject}
/>
```
