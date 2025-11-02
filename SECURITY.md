# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **[vulnerability@productdevbook.com]**

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

## Security Measures

### CI/CD Security

This project implements several security measures for CI/CD:

1. **Fork PR Approval**: Pull requests from forks require manual approval before CI workflows run
2. **Limited Permissions**: Workflows run with minimal required permissions
3. **Dependency Scanning**: Automated dependency vulnerability scanning
4. **Code Review**: All changes require review before merging

### GitHub Repository Settings

Recommended security settings for this repository:

#### Actions Settings

Navigate to: `Settings > Actions > General`

**Fork pull request workflows from outside collaborators:**
- ✅ Select: "Require approval for first-time contributors"
- This prevents unauthorized CI usage and potential secret exposure

**Workflow permissions:**
- ✅ Select: "Read repository contents and packages permissions"
- ✅ Check: "Allow GitHub Actions to create and approve pull requests" (if needed)

#### Branch Protection Rules

Navigate to: `Settings > Branches > Branch protection rules`

For `main` branch:
- ✅ Require a pull request before merging
  - ✅ Require approvals: 1
  - ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - Required checks: `build-test`
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings

#### Secrets and Variables

- Never commit secrets, API keys, or credentials to the repository
- Use GitHub Secrets for sensitive data in workflows
- Rotate secrets regularly
- Limit secret access to necessary workflows only

## Security Best Practices for Contributors

### Code Contributions

1. **Dependency Security**
   - Only add necessary dependencies
   - Review dependencies before adding them
   - Keep dependencies up to date
   - Check for known vulnerabilities: `pnpm audit`

2. **Code Quality**
   - Follow TypeScript strict mode
   - Pass all linting and type checks
   - Include tests for new functionality
   - Avoid using `any` type unless absolutely necessary

3. **MCP Server Security**
   - The MCP server runs locally on user machines
   - Validate all inputs from OpenAPI specs
   - Avoid executing arbitrary code
   - Be cautious with file system operations

4. **OpenAPI Spec Security**
   - Validate OpenAPI specs before processing
   - Sanitize spec content in generated code
   - Avoid including sensitive data in example values

### Pull Request Security

Before submitting a PR:

- [ ] No hardcoded secrets, API keys, or credentials
- [ ] No malicious dependencies added
- [ ] Code follows security best practices
- [ ] Tests cover security-relevant functionality
- [ ] Documentation updated if security behavior changes

## Vulnerability Disclosure Timeline

1. **Day 0**: Vulnerability reported
2. **Day 1-2**: Acknowledge receipt and begin investigation
3. **Day 7**: Provide initial assessment
4. **Day 14-30**: Develop and test fix
5. **Day 30+**: Release patched version and security advisory

We appreciate responsible disclosure and will credit reporters in security advisories (unless they prefer to remain anonymous).

## Known Security Considerations

### MCP Server

- The MCP server is designed to run locally on user machines
- It does not expose network ports or external APIs
- It reads OpenAPI specs from the local file system
- Generated code examples are for demonstration only

### TOON Format

- TOON decoding uses `@toon-format/toon` library
- Malformed TOON files may fail to decode but should not cause security issues
- Always validate decoded OpenAPI specs before use

### Type Generation

- Generated TypeScript types are based on OpenAPI schemas
- Type generation uses `apiful` and `openapi-typescript`
- Generated code should be reviewed before use in production

## Contact

For security-related questions or concerns, contact:

- Email: **[your-security-email@example.com]**
- GitHub: [@productdevbook](https://github.com/productdevbook)

---

**Note**: This security policy is subject to change. Please check back regularly for updates.
