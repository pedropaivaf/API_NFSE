## 2024-05-14 - O(N log N) Sorting Optimization Pattern
**Learning:** In frontend list views like `NfseList.jsx`, filtering *before* sorting reduces the array size from N (total items) to M (filtered subset), shifting the time complexity of the sort operation from O(N log N) to a much faster O(M log M). Sorting first, then filtering, is a common but expensive anti-pattern.
**Action:** When auditing React list components, always check the order of `.filter()` and `.sort()` operations. Combine this with `useMemo` to prevent unnecessary recalculations on re-renders for maximum performance.

## 2024-05-14 - React setState inside useEffect Anti-Pattern
**Learning:** Initializing component state inside a `useEffect` based on synchronous data (like `localStorage` reads) causes an unnecessary double-render cycle on component mount. The component renders once with initial empty state, triggers the effect, updates state, and renders again.
**Action:** Use lazy state initialization `useState(() => localStorage.getItem('key'))` to read synchronous data once during the initial render, completely eliminating the cascading render cycle and improving Time to Interactive (TTI).
