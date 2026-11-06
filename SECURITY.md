# Security Policy

## Reporting a vulnerability

Report privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Do not open a public issue.

To report a malicious or compromised trainer, use the same process in [`opentrainer-trainers`](https://github.com/ahmadreza-log/OpenTrainer-Trainers/security). Maintainers can then revoke it from the catalog.

This is a volunteer project, so we can't promise fixed response times. Security reports take priority over other work.

## Supported versions

No versions have been released yet.

## What is in scope

- Flaws in the application, such as installing a file whose hash doesn't match or running a trainer without consent.
- Weaknesses in catalog parsing, download handling, Tauri permissions or the update process.
- CI weaknesses that could let an unreviewed change reach the published catalog.

## What is not a vulnerability

Antivirus detections of a trainer are not automatically an application vulnerability. Many legitimate trainers are flagged because they modify another process's memory. Report them if you have evidence that one is harmful.

## Limits of our protection

Once the app exists, SHA-256 verification will show that a file matches the catalog entry, not that the file is safe. Trainers will run with your user permissions, or as administrator if you approve elevation, and OpenTrainer won't sandbox them. Only run trainers from authors you trust.
