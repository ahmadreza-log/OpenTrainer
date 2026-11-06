# OpenTrainer

A free, open-source Windows desktop app for discovering, installing and managing game trainers from a community catalog.

> **Status: pre-alpha.** The app builds and installs, but it hasn't had a public release or been tested with a real trainer run from the app.

OpenTrainer is an independent project. It is not affiliated with or endorsed by WeMod, Wand or any game publisher.

## Feature status

| Feature                                     | Status      |
| ------------------------------------------- | ----------- |
| Repository foundation, CI, templates        | Implemented |
| Manifest and catalog schemas (catalog repo) | Implemented |
| Catalog browsing with offline cache         | Implemented |
| Download with SHA-256 verification          | Implemented |
| Local trainer library (SQLite)              | Implemented |
| Version and compatibility display           | Implemented |
| Consent screen and EXE launching            | Implemented |
| Windows installer                           | Implemented |
| Public releases and automatic updates       | Planned     |
| Plugin DLL trainers                         | Planned     |

## Scope

- **Platform:** Windows 10 and 11, x64.
- **Intended use:** single-player and offline gameplay.
- **Out of scope:** anti-cheat bypasses and competitive multiplayer manipulation.

## Security model

Trainers are third-party executable code, and OpenTrainer treats them as untrusted.

- A SHA-256 match proves a file is the one listed in the catalog. It does **not** prove the file is safe or who made it.
- Maintainer review checks metadata and policy. Reviewers cannot prove a closed-source binary is harmless.
- Nothing runs without your explicit consent, which is asked again if the file or its risk changes.

See [SECURITY.md](SECURITY.md) to report a vulnerability.

## Technology

| Area         | Choice                         |
| ------------ | ------------------------------ |
| Desktop      | Tauri 2                        |
| Frontend     | React, TypeScript              |
| Styling      | Tailwind CSS, shadcn/ui        |
| Backend      | Rust                           |
| Local data   | SQLite                         |
| Metadata     | JSON, validated by JSON Schema |
| Distribution | GitHub Releases                |

## Repositories

| Repository                                                                      | Purpose                                                   |
| ------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [`opentrainer`](https://github.com/ahmadreza-log/OpenTrainer)                   | Application source, documentation and application builds  |
| [`opentrainer-trainers`](https://github.com/ahmadreza-log/OpenTrainer-Trainers) | Game catalog, trainer manifests and community submissions |

Read [how the repositories relate](docs/repository-relationship.md).

## Documentation

- [Architecture and design review](docs/architecture.md)
- [Repository relationship and contribution workflow](docs/repository-relationship.md)
- [Implementation roadmap](docs/roadmap.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the application, or the [`opentrainer-trainers`](https://github.com/ahmadreza-log/OpenTrainer-Trainers) repository to add a trainer. All participants follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

The OpenTrainer application is released under the [MIT License](LICENSE). This license does not cover third-party trainers listed in the catalog. Each trainer keeps its author's own license.
