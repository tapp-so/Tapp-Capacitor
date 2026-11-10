# Releasing

Releases are published to npm manually from GitHub Actions using the
**Publish** workflow (`.github/workflows/publish.yml`) for the package
`tapp-capacitor-sdk`.

## Prerequisites

- The version in `package.json` must be a prerelease whose first prerelease
  identifier equals `publishConfig.tag` (`alpha`), e.g. `0.1.0-alpha.0`. The
  workflow refuses otherwise (`0.1.0` and `0.1.0-beta.0` both fail).
- CI (`ci.yml`) must be green on `main`, including the iOS job. The Publish
  workflow only runs lint, typecheck and tests on Linux.
- The workflow only runs from `main`.

## One-time setup

1. Create a GitHub environment named `npm-publish` (Settings > Environments)
   with Nick as required reviewer. Optionally restrict deployment branches to
   `main`.
2. Add `NPM_TOKEN` as an **environment** secret of `npm-publish`, not as a
   repository secret. Use an npm granular access token with read and write
   permission.
3. A token scoped to this package may not be possible before the package
   exists. For the first publish use one scoped to all packages (short
   expiry), then narrow it to this package or replace it with trusted
   publishing (see below).

## Why `publishConfig` has `access: public`

A first-time provenance publish of a new package fails ("Can't generate
provenance for new or private package, you must set access to public")
without it. `npm publish --dry-run` does not catch this.

## Release

1. Run **Publish** on `main` with `dry_run` checked (the default) and approve
   the `npm-publish` environment. Read the file list in the log and confirm
   it contains only the intended files. The dry-run log may say "tag latest";
   this is expected. The real publish uses tag `alpha` from `publishConfig`.
2. Run **Publish** again with `dry_run` unchecked. This publishes under the
   `alpha` dist-tag with provenance.
3. Creating a git tag / GitHub release is manual; the workflow does not do it.

## Notes

- Provenance only works from GitHub Actions (OIDC), so a local `npm publish`
  fails.
- `RELEASING.md` is not in the npm package (the `files` allowlist excludes it).

## Optional: trusted publishing (after the first publish)

- Publishing with a dist-tag via OIDC requires npm >= 11.21.0 (Node 22 ships
  npm 10.9.9, Node 24 ships 11.19.1). The workflow already runs
  `npm install -g npm@11.21.0` (or use a newer version) and sets
  `package-manager-cache: false`.
- On npmjs.com, open the package settings and add a trusted publisher for this
  repository, workflow file `publish.yml` and environment `npm-publish`.
- The first OIDC publish must happen within the window npm states.
- Then delete the `NPM_TOKEN` environment secret and the `NODE_AUTH_TOKEN`
  line in `publish.yml`.
