# Implementation Roadmap

Listed in priority order. Each stage depends on the ones before it.

## 1. Publish the foundation

- [x] Decide the trainers repository license (D1)
- [ ] Decide the conduct contact, reviewers and name (D9, D10 in [open decisions](architecture.md#open-decisions))
- [ ] Decide hosting rules (D2)
- [ ] Replace the `CONDUCT_CONTACT` placeholder in both repositories
- [x] Create both public repositories and push
- [x] Enable private vulnerability reporting on both
- [x] Protect `main`: require pull requests
- [ ] Add required status checks: `format`, `frontend` and `rust` in OpenTrainer, `validate` in OpenTrainer-Trainers
- [x] Pin GitHub Actions to commit SHAs

## 2. Prove the catalog with real data

- [ ] Add 3 to 5 trainers whose authors publish on GitHub or have given permission (2 prepared so far; see the [evidence log](https://github.com/ahmadreza-log/OpenTrainer-Trainers/blob/main/docs/catalog-evidence.md))
- [ ] Publish the first `catalog.v1.json` with real entries
- [x] Write a maintainer review checklist from what those submissions teach us
- [ ] Decide whether archives should be supported (D3), since most credible trainers ship as archives

## 3. Scaffold the application

- [x] Create the Tauri 2, React and TypeScript app
- [x] Add Tailwind CSS and shadcn/ui
- [x] Add lint, typecheck and test scripts so CI runs them
- [x] Lock down Tauri capabilities

## 4. Catalog client

- [x] Fetch, validate and cache the catalog
- [x] Fall back to the cached copy when offline
- [x] Add browse and search screens

## 5. Secure downloads and library

- [x] Add SQLite storage and migrations
- [x] Stream downloads with size limits and SHA-256 checks
- [x] Install and uninstall trainers
- [x] Show version and compatibility status

## 6. Consent and execution

- [x] Document the execution rules in the architecture doc
- [x] Add the consent screen and record consent per file hash
- [x] Launch EXEs as a separate process
- [x] Block revoked releases and warn on stale catalogs (D6)

## 7. Public release

- [ ] Decide on signing and updates (D7)
- [x] Build the release workflow
- [ ] Publish the first release to GitHub Releases
- [ ] Test a real trainer install and launch through the app
- [ ] Test on clean Windows 10 and 11 machines

## 8. Later

- [ ] Publisher trust and catalog signing (D5)
- [ ] Archive support (D3)
- [ ] Plugin DLL design, host process and schema v2 (D4)
