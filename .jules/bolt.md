
## 2024-05-15 - Extract Intl formatters outside React render cycle
**Learning:** Instantiating `Intl.NumberFormat` and `Intl.DateTimeFormat` (e.g., implicitly via `new Date().toLocaleDateString()`) repeatedly inside render cycles and map loops causes significant performance overhead in large lists. In `NfseList.jsx`, formatting currency and dates for every row of a large table within the render function was a noticeable bottleneck.
**Action:** Always extract `Intl` formatter instantiations into module-level constants to reuse a single instance and improve rendering speed across the application.
