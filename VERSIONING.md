# Versioning System for DefesAi Platform

## Overview

This document outlines the versioning system for the DefesAi platform to ensure stability and reliability in production.

## Branch Structure

- **main**: Protected branch representing production. Only stable, tested code should be merged here.
- **develop**: Main development branch where features are implemented and tested.
- **feature/***: Short-lived feature branches created from develop.
- **release/***: Release candidate branches for final testing before merging to main.

## Workflow

1. **Feature Development**
   - Create a new branch from `develop`: `git checkout -b feature/<feature-name>`
   - Make changes and commit frequently
   - Keep commits small and focused

2. **Code Review**
   - Submit a Pull Request (PR) from feature branch to develop
   - The PR must pass all quality gates:
     - Linting passes
     - Tests pass
     - Code review approved
   - Address all feedback before merging

3. **Merging to Main**
   - Only maintainers can merge to main
   - Main branch must pass all quality gates
   - No direct commits to main branch

4. **Release Cycle**
   - When ready for release, create a `release/x.x.x` branch from develop
   - Run final validation tests
   - Merge release branch to main
   - Tag the release with version number
   - Deploy to production

## Versioning Scheme

We use Semantic Versioning (SemVer):
- MAJOR version bump: Breaking changes to public API
- MINOR version bump: New features added without breaking compatibility
- PATCH version bump: Bug fixes and minor improvements

Example versioning:
- v1.0.0 → Initial release
- v1.1.0 → Added new feature (minor version)
- v1.1.1 → Bug fix (patch version)
- v2.0.0 → Major refactor with breaking changes

## Versioning Workflow

1. **Start a new feature**:
   ```bash
   git checkout develop
   git checkout -b feature/user-authentication
   ```

2. **Implement feature**:
   - Make changes
   - Write tests
   - Run local verification

3. **Submit PR**:
   - Open PR against develop branch
   - Ensure all checks pass
   - Get at least 1 approval from maintainer

4. **Merge to develop**:
   - Once approved, merge feature branch into develop
   - Delete feature branch after merge

5. **Release preparation**:
   - Create release branch: `git checkout -b release/1.2.0 develop`
   - Run final validation tests
   - Fix any issues found
   - Merge release branch into main

6. **Release tagging**:
   - Create git tag: `git tag v1.2.0`
   - Push tag: `git push origin v1.2.0`

## Versioning Workflow

1. **Development**: Work happens on `develop` branch
2. **Testing**: Automated tests run on every push to develop
3. **Review**: PRs must pass quality gates before merging
4. **Release**: Create release branch, validate, then merge to main
5. **Deploy**: Vercel deploys automatically on main branch pushes

## Security Considerations

- Never commit sensitive information (API keys, passwords) to git
- Use `.gitignore` to exclude sensitive files
- Use Vercel's environment variable management for secrets
- Sign commits with GPG for accountability
- Regularly review security dependencies