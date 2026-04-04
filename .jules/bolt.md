## 2024-04-03 - React Array Operations on Render
**Learning:** The React application calculates heavily nested array operations (like `filter`, `map`, and `reduce`) directly in component bodies, particularly in lists with expandable rows. This causes UI lag when simply toggling a row's display state.
**Action:** Always check array manipulations in React lists and apply `useMemo` when calculating filtered sets or statistics that depend on heavy object traversal.
