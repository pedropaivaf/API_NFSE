## 2024-03-05 - Interactive Divs & Icon-Only Buttons
**Learning:** A common accessibility antipattern exists in the components (e.g., `NfseList.jsx`) where `<div>` elements are used as clickable list headers without native keyboard interactions or ARIA roles. Furthermore, icon-only buttons lack `aria-label` attributes and keyboard focus states.
**Action:** Always verify custom interactive elements to ensure they use semantic tags like `<button>` and include `focus-visible` styling alongside `aria-label`s for screen readers.
