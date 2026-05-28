# Zeref — Verification commands

This page documents **Phase 0** verification commands and what they gate. CI must fail if these commands fail.

## Phase 0 (foundation scaffold)

Run from the repo root.

```powershell
npm install
npm run build
npm run lint
npm run verify:phase-0
```

### What each command checks

- **`npm run build`**: Builds the TypeScript project using `tsc -b` (project references).
- **`npm run lint`**: Phase 0 lint/typecheck gate (currently `tsc -b ... --noEmit`).
- **`npm run verify:phase-0`**: Asserts required Phase 0 scaffold paths exist and runs `@zeref/contracts` tests.

