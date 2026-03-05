## 2024-05-24 - Accessible Action Buttons in Tables
**Learning:** Found a pattern where icon-only action buttons in data tables (like "Download" in NfseList) were missing `aria-label` attributes and focus-visible states, making them difficult for screen reader users and keyboard navigators to identify the specific row action.
**Action:** When adding or reviewing action buttons in table rows, always ensure they have context-specific `aria-label`s (e.g. including the ID or access key) and clear `focus-visible` ring styles.
