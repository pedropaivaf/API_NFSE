## 2025-03-22 - ESLint Catch Block Error Binding
**Learning:** In the `web/` directory, the ESLint configuration enforces unused variable rules strictly. When an error object (`err`) is completely unused inside a `catch` block, prefixing it with an underscore (e.g., `catch (_err)`) might still cause `pnpm lint` to fail depending on the specific `varsIgnorePattern` implementation.
**Action:** To reliably pass lint checks for unused exceptions, omit the error binding entirely using the ES2019 optional catch binding syntax: `catch { ... }` instead of `catch (err) { ... }` or `catch (_err) { ... }`.

## 2025-03-22 - ESLint Global Ignores
**Learning:** The `web/` directory uses an ESLint flat config (`eslint.config.mjs`). By default, it might attempt to lint non-ES module configuration files or Node.js scripts (like `postcss.config.js`, `tailwind.config.js`, `ico-gen.js`, or files in the `electron/` folder), resulting in errors like `'module' is not defined` or `'require' is not defined`.
**Action:** Always ensure these non-frontend module files are explicitly excluded by adding them to the `globalIgnores` array in `eslint.config.mjs`.
