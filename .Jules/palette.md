## 2024-03-24 - Accessibility improvements on Login screen
**Learning:** Adding semantic HTML attributes like `for` on `<label>` elements, `id` on `<input>` elements, and WAI-ARIA properties (`role=alert`, `aria-invalid`, `aria-describedby`) is crucial for screen readers. Using `aria-hidden='true'` helps hide decorative elements like icons, preventing noise for visually impaired users.
**Action:** When creating forms, make sure to always map labels to inputs, use descriptive aria labels, and hide decorative elements to keep the DOM semantic and accessible.
