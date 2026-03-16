#!/usr/bin/env sh

# Shared checks for pre-commit and pre-merge-commit hooks.
# Only runs when the current branch is develop or main.

branch=$(git rev-parse --abbrev-ref HEAD)

if [ "$branch" != "develop" ] && [ "$branch" != "main" ]; then
  exit 0
fi

echo "🔀 Running checks on $branch..."

# Check for security vulnerabilities
echo "🔒 Checking for security vulnerabilities..."

if ! npm audit --audit-level=moderate; then
  echo ""
  echo "❌ Security vulnerabilities found!"
  echo "Please fix the vulnerabilities before continuing."
  echo "Run 'npm audit' for more details or 'npm audit fix' to attempt automatic fixes."
  exit 1
fi

echo "✅ No vulnerabilities found"

# Format code with Prettier
echo "🎨 Formatting code..."
npm run format
git add -u

echo "✅ Code formatted successfully"

# Run linting (fail only on errors, not warnings)
echo "🔍 Running ESLint..."
if ! npm run lint; then
  echo ""
  echo "❌ ESLint errors found!"
  echo "Please fix the errors before continuing."
  echo "Run 'npm run lint' for details."
  exit 1
fi

# Verify generated client is up to date
echo "🔄 Verifying generated client is up to date..."
npm run build-client

if ! git diff --quiet -- src/Client/; then
  echo ""
  echo "❌ Generated client (src/Client/) is out of date!"
  echo "Run 'npm run build-client' and stage the changes before committing."
  exit 1
fi

echo "✅ Generated client is up to date"

echo "✅ All checks passed!"
