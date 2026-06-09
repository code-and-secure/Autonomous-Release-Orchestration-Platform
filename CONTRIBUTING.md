# Contributing Guide

Thank you for your interest in contributing.

## How to contribute

1. Fork the repository.
2. Create a feature branch from main.
3. Make focused changes with clear commit messages.
4. Add or update tests where relevant.
5. Open a pull request with a clear description.

## Development setup

1. Install tools listed in docs/setup.md.
2. Run local tests:

```bash
cd app
npm ci
npm test
```

3. Validate Kubernetes manifests if changed.
4. Keep docs updated when behavior changes.

## Pull request checklist

- The change is scoped and understandable.
- CI passes.
- Documentation is updated if needed.
- No secrets or credentials are committed.

## Code style

- Keep changes small and review-friendly.
- Prefer readable code over clever code.
- Add comments only where logic is not obvious.

## Reporting issues

- Use a clear title.
- Provide reproduction steps.
- Include expected vs actual behavior.
- Include logs or screenshots when useful.
