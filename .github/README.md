# CI/CD for Pull Requests

This project uses GitHub Actions to automatically test pull requests.

## What gets tested on every Pull Request:

### ✅ Frontend Tests (Vue.js)
- **Linting**: Code style and quality checks
- **Type Checking**: TypeScript validation
- **Unit Tests**: Component and utility testing
- **Build**: Ensures the application builds successfully

### ✅ ML Notebook Tests (Python)
- **Requirements**: Validates Python dependencies
- **Notebook Execution**: Tests that notebooks run without errors

### ✅ Security Checks
- **npm audit**: Checks for vulnerable dependencies
- **Secret scanning**: Looks for hardcoded credentials

## How it works:

1. **Create a Pull Request** targeting the `master` branch
2. **GitHub Actions automatically runs** all tests
3. **All checks must pass** before the PR can be merged
4. **Review the results** in the PR checks section

## Local Testing:

Before creating a PR, you can run tests locally:

```bash
# Frontend tests
cd medpix-explorer
npm run lint
npm run type-check
npm run test:unit
npm run build

# Python tests (if notebooks exist)
cd Ml-Notebook
python test_notebooks.py
```

## Status Badges:

The workflow creates status checks that appear in your Pull Request:
- ✅ Test Vue.js Frontend
- ✅ Test ML Notebooks  
- ✅ Basic Security Scan
- ✅ Quality Gate

All must be green (✅) before merging!
