## 2024-03-31 - React Accordion Performance in Lists
**Learning:** Expanding/collapsing accordions in large lists triggers a full re-render. If heavy data transformations (like map/filter chains reducing thousands of items) are calculated during render, the UI freezes on toggle.
**Action:** Always wrap expensive list derivations in `useMemo` when local UI state (like `expandedRows`) triggers frequent component updates.
