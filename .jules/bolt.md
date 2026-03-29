## 2026-03-20 - Expensive Derived State without Memoization
**Learning:** Found an anti-pattern in `NfseList.jsx` where large arrays of grouped NF-e data were mapped, filtered, and reduced on every single component render (e.g. typing in search, toggling accordions) without any memoization. In apps rendering thousands of rows/items, this O(N) recalculation blocks the main thread.
**Action:** When finding heavy map/filter/reduce operations deriving state from a large source array in a React component, use `useMemo` to cache the result, adding proper dependencies.
