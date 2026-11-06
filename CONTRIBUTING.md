# Contributing to OpenTrainer

Thanks for helping. This repository is for the application. To add or update a trainer, use [`opentrainer-trainers`](https://github.com/ahmadreza-log/OpenTrainer-Trainers).

The application has not been scaffolded yet, so the most useful contributions right now are design feedback on [open decisions](docs/architecture.md#open-decisions) and items from the [roadmap](docs/roadmap.md).

## Ground rules

- Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Report vulnerabilities privately, as described in [SECURITY.md](SECURITY.md).
- Open an issue before starting large changes.
- Keep each pull request to one purpose.
- Never commit trainer binaries or secrets.

## Out of scope

These will be declined:

- Anti-cheat bypasses or evasion.
- Features aimed at competitive multiplayer manipulation.
- Antivirus or SmartScreen evasion.
- Paid gating of core features.
- Features that need a mandatory dedicated server.

## Security rules for code

- Treat trainers, manifests and catalog data as untrusted input.
- Validate data in Rust. Never rely on the frontend to enforce a security rule.
- Never load a trainer DLL into the application process.
- Never run a trainer without recorded user consent.
- Keep Tauri capabilities to the minimum each feature needs.

## Development

Requirements once the application exists: Node.js LTS, the stable Rust toolchain and the [Tauri prerequisites for Windows](https://tauri.app/start/prerequisites/).

These commands apply after scaffolding:

```bash
npm ci
npm run tauri dev
```

## Pull requests

1. Branch from `main`.
2. Make the change and add tests for non-trivial logic.
3. Make sure CI passes. It checks formatting, and linting and tests once the code exists.
4. Fill in the pull request template.

Contributions are licensed under the [MIT License](LICENSE).
