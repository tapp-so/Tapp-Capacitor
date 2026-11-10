# Releasing

Releases are published to npm manually from GitHub Actions using the
**Publish** workflow (`.github/workflows/publish.yml`).

## Prerequisites

- CI (`ci.yml`) must be green on `main`, including the iOS job. The Publish
  workflow does not run iOS or Android builds.
- The version in `package.json` must be a prerelease such as `0.1.0-alpha.0`.
  The workflow refuses to run otherwise.
- The repository secret `NPM_TOKEN` must exist (Settings > Secrets and
  variables > Actions). Use an npm granular access token with read and
  write (publish) permission on this package, intended for automation.

## Publish

1. Open the **Actions** tab, choose **Publish**, and click **Run workflow**
   on `main`.
2. Leave `dry_run` checked for the first run. The workflow runs lint,
   typecheck and tests, then `npm publish --dry-run`. Read the file list in
   the log and confirm it contains only the intended files.
3. Run the workflow again with `dry_run` unchecked. This publishes under the
   `alpha` dist-tag with provenance. Both settings come from `publishConfig`
   in `package.json`.

## Notes

- Provenance only works when publishing from GitHub Actions (OIDC). A local
  `npm publish` will fail because `publishConfig` sets `provenance: true`.
- `RELEASING.md` is not shipped in the npm package: the `files` allowlist in
  `package.json` does not include it.

## Optional: npm trusted publishing

After the first publish the package exists on npm, so you can configure
trusted publishing:

1. On npmjs.com, open the package settings and add a trusted publisher for
   this GitHub repository and the workflow file `publish.yml`.
2. Delete the `NPM_TOKEN` repository secret.
3. Remove the `NODE_AUTH_TOKEN` env line from `publish.yml`.
