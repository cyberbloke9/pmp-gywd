# Releasing GYWD

> Guide for maintainers on creating new releases.

## Release Checklist

Before creating a release:

- [ ] All tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Validations pass: `npm run validate:all`
- [ ] CHANGELOG.md updated with new version
- [ ] package.json version bumped
- [ ] All changes committed and pushed

## Quick Release

```bash
# 1. Ensure everything passes
npm run release

# 2. Create and push tag
git tag v3.3.0
git push origin v3.3.0
```

The GitHub Actions release workflow handles the rest automatically.

## Detailed Process

### 1. Prepare the Release

```bash
# Run all checks
npm run release

# This runs: lint + validate:all + test
```

### 2. Update Version

Edit `package.json`:
```json
{
  "version": "X.Y.Z"
}
```

Update `CHANGELOG.md` with the new version section.

### 3. Commit Changes

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to vX.Y.Z"
git push
```

### 4. Create Tag

```bash
# Create annotated tag
git tag -a vX.Y.Z -m "Release vX.Y.Z"

# Push tag to trigger release
git push origin vX.Y.Z
```

### 5. Automated Pipeline

When you push a tag starting with `v`, GitHub Actions:

1. **Runs tests** — Ensures code passes before publish
2. **Publishes to npm** — Uses `NPM_TOKEN` secret
3. **Creates GitHub Release** — With auto-generated changelog

## GitHub Actions Workflows

### CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push and PR:
- Multi-platform tests (Ubuntu, macOS, Windows)
- Multi-Node version tests (16, 18, 20, 22)
- ESLint
- Schema/command validation
- Security audit

### Release Pipeline (`.github/workflows/release.yml`)

Runs on tag push (`v*`):
- Pre-release tests
- npm publish
- GitHub Release creation

## Required Secrets

| Secret | Purpose |
|--------|---------|
| `NPM_TOKEN` | npm authentication for publish |
| `GITHUB_TOKEN` | Auto-provided for GitHub releases |
| `CODECOV_TOKEN` | Optional: coverage reporting |

## Versioning

GYWD follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (0.X.0): New features, backwards compatible
- **PATCH** (0.0.X): Bug fixes, backwards compatible

## Troubleshooting

### npm publish fails

1. Check `NPM_TOKEN` secret is set in repository settings
2. Verify token has publish permissions
3. Check package name isn't taken

### Tests fail in CI but pass locally

1. Check Node version matches CI matrix
2. Look for platform-specific issues (Windows paths)
3. Ensure no local-only dependencies

### Tag already exists

```bash
# Delete local tag
git tag -d vX.Y.Z

# Delete remote tag
git push origin :refs/tags/vX.Y.Z

# Recreate tag
git tag vX.Y.Z
git push origin vX.Y.Z
```

### GitHub Release not created

1. Check `contents: write` permission in workflow
2. Verify `GITHUB_TOKEN` is available
3. Check workflow logs for errors

## Manual npm Publish

If automation fails, publish manually:

```bash
# Login to npm
npm login

# Publish
npm publish
```

---

*See also: [Contributing](CONTRIBUTING.md) | [Commands](COMMANDS.md)*
