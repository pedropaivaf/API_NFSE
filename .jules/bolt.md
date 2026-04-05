## 2024-04-05 - [React Performance]
**Learning:** Found O(N) mapping, filtering and reducing running on every single render in NfseList.jsx, including when expanding/collapsing UI items.
**Action:** Use `useMemo` for derived states which depend on large lists, like filtering and reducing groups.