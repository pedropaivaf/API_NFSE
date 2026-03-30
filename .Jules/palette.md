## 2024-03-30 - Added ARIA labels to icon-only buttons
**Learning:** This app extensively uses Lucide icons within buttons without accessible names (e.g., modals, form toggles, table actions).
**Action:** Always check and add `aria-label` to icon-only buttons to ensure screen reader compatibility, especially dynamic labels for stateful buttons like password visibility.