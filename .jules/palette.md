## 2024-05-28 - Improving Accessibility for Interactive Divs

**Learning:** When making an interactive `<div>` keyboard-accessible (like a collapsible header), simply adding `tabIndex={0}` and a `focus-visible:ring-*` utility might result in conflicting focus styles because browsers add a default outline to focused elements. Furthermore, replacing it with a `<button>` is invalid HTML if there are other interactive elements nested within.
**Action:** Use `outline-none` alongside `focus-visible:ring-2` to suppress the default browser outline while providing a custom, accessible focus ring. Retain the `<div>` structure, adding `role="button"`, `tabIndex={0}`, and `onKeyDown` handlers for Enter/Space to ensure full keyboard interactivity without invalidating HTML.
