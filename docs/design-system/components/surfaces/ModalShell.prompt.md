Dialog frame for stats, transfer data, album info.

```jsx
<ModalShell eyebrow="Your stats" title="Stats..." onClose={close} footer={<PressButton variant="outline">Transfer data</PressButton>}>
  <InfoRow icon="…" title="Win streak">5 days in a row</InfoRow>
</ModalShell>
```

- Keep the brand ellipsis in titles ("Stats...", "Transfer Data...").
- Footer stacks outline buttons full-width.
