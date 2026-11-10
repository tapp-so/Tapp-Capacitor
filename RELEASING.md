# Releasing

The first version of `tapp-capacitor-sdk`, `0.1.0-alpha.0`, is published manually
by a maintainer. Every later version is published only from the **Publish**
workflow in `tapp-so/Tapp-Capacitor` using npm trusted publishing (OIDC).
No npm token is used anywhere in the release process.

## Prerequisites for any release

- The version must be a prerelease whose first identifier equals
  `publishConfig.tag` (`alpha`), for example `0.1.0-alpha.0`.
- CI (`ci.yml`) must be green on `main`, including iOS.
- The Publish workflow only runs from `main`. Never publish from another branch.
- Create the GitHub environment `npm-publish` with Nick as required reviewer.
  Optionally limit it to `main`.
- No `NPM_TOKEN` secret is needed or used. Remove any existing `NPM_TOKEN` secret.

## Step 1: First publish (manual, once)

Use an up-to-date `main` checkout with Node >= 22.14.0 and npm 11.21.0.
Confirm that `package.json` has version `0.1.0-alpha.0`, then run:

```sh
git switch main && git pull --ff-only
npm install -g npm@11.21.0
npm login
npm ci
npm publish --dry-run --provenance=false
```

Log in with 2FA enabled. Read the dry-run file list before publishing:

```sh
npm publish --provenance=false
npm view tapp-capacitor-sdk dist-tags
```

The publish prompts for the 2FA code. The `prepack` script builds `dist/`;
`publishConfig` supplies the `alpha` tag and public access. The log may say
"tag latest"; check the dist-tags afterwards with the command above.

`publishConfig.provenance` is true, and provenance can only be generated in CI,
so a local publish without `--provenance=false` fails. The CLI flag overrides
`publishConfig`, as verified with npm 11.21.0. The environment variable
`NPM_CONFIG_PROVENANCE=false` does not override `publishConfig`, so use the flag.
Temporarily editing `publishConfig` also works but leaves a local change;
do not commit it. A dry run does not generate provenance or detect this failure.
The first version has no provenance statement; later CI versions do.

## Step 2: Link the trusted publisher on npmjs.com

Only create this configuration when the next version is ready to go out from CI.
Open the `tapp-capacitor-sdk` package **Settings** -> **Trusted Publisher**.
Under **Select your publisher**, click **GitHub Actions** and enter:

- **Organization or user:** `tapp-so`
- **Repository:** `Tapp-Capacitor`
- **Workflow filename:** `publish.yml` (filename only; it exists in `.github/workflows/`)
- **Environment name:** `npm-publish`
- **Allowed actions:** explicitly allow `npm publish`, because the workflow runs
  `npm publish`. `npm stage publish` is always allowed. Leave **Allow npm dist-tag**
  off unless needed.

New configurations created after September 3, 2026 allow only `npm stage publish`
by default, so direct publishing must be explicitly enabled.
Fields are case-sensitive and npm does not verify them when saved.
The new configuration must complete its first successful publish within **2 days**
or it expires. If it expires, delete it, create a new one, and publish within
2 days.

## Step 3: First CI release via trusted publishing

1. Bump the version on `main` through a reviewed PR, keeping the `alpha` prerelease
   identifier. Wait for CI, including iOS, to pass.
2. Run **Publish** on `main` with `dry_run` checked (the default). Approve the
   `npm-publish` environment and read the file list in the logs.
   A dry run does not validate the trusted publisher.
3. Run **Publish** again with `dry_run` unchecked and approve the environment.
   This real `npm publish` must succeed within the **2-day** window after linking
   the trusted publisher. Confirm that this first trusted-publishing release from
   the **Publish** workflow has succeeded before continuing to Step 4.

## Step 4: Lock down publishing access

In package **Settings** -> **Publishing access**, select
**Require two-factor authentication and disallow tokens**, then click
**Update Package Settings**. Trusted publishing keeps working through OIDC;
manual publishes still require 2FA.

## Later releases (CI only)

1. Bump the version on `main` through a reviewed PR, keeping the `alpha` prerelease
   identifier. Wait for CI, including iOS, to pass.
2. Run **Publish** on `main` with `dry_run` checked (the default). Approve the
   `npm-publish` environment and read the file list in the logs.
3. Run **Publish** again with `dry_run` unchecked and approve the environment.
   The workflow refuses versions already on npm and non-matching prereleases.
   Provenance is generated automatically for trusted publishing because the
   repository and package are public; `publishConfig.provenance` stays true.
4. Creating a git tag or GitHub release is manual.

The workflow installs npm 11.21.0 and checks Node >= 22.14.0 and npm >= 11.21.0.
Trusted publishing needs npm >= 11.5.1; using a dist-tag over OIDC needs >= 11.21.0.
GitHub Actions provides OIDC automatically through the job's `id-token: write`.

## Notes

- `RELEASING.md` is not in the npm package because of the `files` allowlist.
- The case-sensitive GitHub owner/repo in `repository.url` must match
  `tapp-so/Tapp-Capacitor`. The `git+https://github.com/<owner>/<repo>.git` form
  used here (`git+https://github.com/tapp-so/Tapp-Capacitor.git`) is fine.
