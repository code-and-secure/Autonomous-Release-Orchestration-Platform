# Security Policy

## Supported versions

This project is in active learning and development stage.
Security fixes are applied to the main branch.

## Reporting a vulnerability

Please do not open public issues for security vulnerabilities.

Report vulnerabilities privately with:

- A clear description of the issue
- Steps to reproduce
- Potential impact
- Suggested mitigation (if known)

Contact: maintainers via private repository security advisory workflow.

## Response process

1. Acknowledge report within 3 business days.
2. Validate and triage severity.
3. Prepare and test a fix.
4. Coordinate disclosure and release notes.

## Best practices for contributors

- Never commit secrets, tokens, or kubeconfig files.
- Use least-privilege credentials.
- Keep dependencies and base images updated.
- Run security scans in CI where possible.
