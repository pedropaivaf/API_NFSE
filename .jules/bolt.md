## 2026-03-16 - Prevent repeated Intl.NumberFormat instantiation in React map loops
**Learning:** Instantiating `Intl.NumberFormat` repeatedly inside render cycles or loop (e.g., `Array.map`) for currency formatting is a performance anti-pattern. Caching it into a module-level constant significantly reduces CPU overhead during rendering.
**Action:** Extract `Intl.NumberFormat` into a module-level constant `currencyFormatter` to be reused.
