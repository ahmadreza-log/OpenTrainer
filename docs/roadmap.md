# Implementation Roadmap

Listed in priority order. Each stage depends on the ones before it.

## 1. Publish the foundation

- [x] Decide the trainers repository license (D1)
- [ ] Decide the conduct contact, reviewers and name (D9, D10 in [open decisions](architecture.md#open-decisions))
- [ ] Decide hosting rules (D2)
- [ ] Replace the `CONDUCT_CONTACT` placeholder in both repositories
- [x] Create both public repositories and push
- [ ] Enable private vulnerability reporting on both
- [ ] Protect `main`: require pull requests and passing CI
- [ ] Pin GitHub Actions to commit SHAs

## 2. Prove the catalog with real data

- [ ] Add 3 to 5 trainers whose authors publish on GitHub or have given permission
- [ ] Publish the first `catalog.v1.json`
- [ ] Write a maintainer review checklist from what those submissions teach us

## 3. Scaffold the application

- [ ] Create the Tauri 2, React and TypeScript app
- [ ] Add Tailwind CSS and shadcn/ui
- [ ] Add lint, typecheck and test scripts so CI runs them
- [ ] Lock down Tauri capabilities

## 4. Catalog client

- [ ] Fetch, validate and cache the catalog
- [ ] Fall back to the cached copy when offline
- [ ] Add browse and search screens

## 5. Secure downloads and library

- [ ] Add SQLite storage and migrations
- [ ] Stream downloads with size limits and SHA-256 checks
- [ ] Install and uninstall trainers
- [ ] Show version and compatibility status

## 6. Consent and execution

- [ ] Write and approve an execution design first
- [ ] Add the consent screen and record consent per file hash
- [ ] Launch EXEs as a separate process
- [ ] Block revoked releases and warn on stale catalogs (D6)

## 7. Public release

- [ ] Decide on signing and updates (D7)
- [ ] Build the release workflow and publish to GitHub Releases
- [ ] Test on clean Windows 10 and 11 machines

## 8. Later

- [ ] Publisher trust and catalog signing (D5)
- [ ] Archive support (D3)
- [ ] Plugin DLL design, host process and schema v2 (D4)
