## 2024-05-24 - Accessible Accordion Headers

**Learning:** When using `<div>` elements as interactive accordion headers (like in `NfseList.jsx`), adding native-like keyboard accessibility requires more than just `tabIndex={0}`. You must also implement `onKeyDown` handlers for `Enter` and `Space` to trigger the toggle action, and provide a clear visual focus state. Additionally, in Tailwind CSS, relying solely on `focus-visible:ring-2` might not suppress the default browser outline in all cases (like Chromium's black outline); applying `outline-none` alongside the `focus-visible` utilities is necessary for a clean, custom focus ring.

**Action:** Whenever implementing custom interactive elements using generic tags like `<div>`, always ensure `role`, `tabIndex`, `aria-expanded` (if applicable), keydown handlers for `Enter`/`Space`, and `outline-none focus-visible:ring-2` (plus ring color) are included.
