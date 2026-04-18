# Publishing to GitHub Packages (Private)

## Setup (One-Time)

### 1. Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: "ChittyOS Packages"
4. Scopes needed:
   - ✅ `write:packages` (to publish)
   - ✅ `read:packages` (to install)
   - ✅ `delete:packages` (to delete versions)
5. Copy the token

### 2. Set Environment Variable

```bash
# Add to ~/.bashrc or ~/.zshrc
export GITHUB_TOKEN=ghp_your_token_here

# Or set in current session
export GITHUB_TOKEN=ghp_your_token_here
```

### 3. Configure npm for GitHub Packages

Already configured in `.npmrc`:
```
@chittyos:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## Publishing

### Publish to GitHub Packages

```bash
cd /Users/nb/Projects/development/chittyschema

# Ensure GITHUB_TOKEN is set
echo $GITHUB_TOKEN

# Publish (private by default on GitHub Packages)
npm publish

# Verify
npm view @chittyos/schema
```

## Installing in Services

Services need to configure GitHub Packages access:

### 1. Add `.npmrc` to Service

```bash
# In chittyauth/.npmrc (or any service)
@chittyos:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### 2. Install Package

```bash
npm install @chittyos/schema
```

### 3. For CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
- name: Setup Node
  uses: actions/setup-node@v4
  with:
    node-version: '18'
    registry-url: 'https://npm.pkg.github.com'
    scope: '@chittyos'

- name: Install Dependencies
  run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Advantages of GitHub Packages

✅ **Private by default** - Only accessible with authentication
✅ **Free for private repos** - No cost for private packages
✅ **Integrated with GitHub** - Works with existing repos
✅ **Per-repo access control** - Fine-grained permissions
✅ **Automatic versioning** - Tied to git releases

## Package Info

- **Name**: `@chittyos/schema`
- **Registry**: `https://npm.pkg.github.com/`
- **Visibility**: Private
- **Access**: Requires GITHUB_TOKEN

## Verify Publication

```bash
# Check package exists
npm view @chittyos/schema --registry=https://npm.pkg.github.com/

# Or visit:
# https://github.com/chittyfoundation/chittyschema/packages
```

## Troubleshooting

### "401 Unauthorized"
- Check GITHUB_TOKEN is set: `echo $GITHUB_TOKEN`
- Ensure token has `write:packages` scope
- Token must be for a user with write access to repo

### "404 Not Found" when installing
- Service needs `.npmrc` configured
- Service needs GITHUB_TOKEN in environment
- Check package name is correct: `@chittyos/schema`

### Package not showing in GitHub
- May take a few minutes to appear
- Check: https://github.com/orgs/chittyfoundation/packages

## Migration from Public npm (if needed)

If you previously published to npm:

```bash
# Unpublish from npm (within 72 hours)
npm unpublish @chittyos/schema@0.1.1 --registry=https://registry.npmjs.org/

# Then publish to GitHub
npm publish
```
