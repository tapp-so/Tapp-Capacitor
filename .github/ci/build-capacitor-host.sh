#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."
repo_root="$(pwd)"

if [[ $# -ne 1 || ! $1 =~ ^[0-9]+$ ]]; then
  echo "Usage: $0 <capacitor-major>" >&2
  exit 1
fi
if [[ -z ${EXPECTED_HOST_AGP:-} ]]; then
  echo "Usage: EXPECTED_HOST_AGP=<agp-version> $0 <capacitor-major> (EXPECTED_HOST_AGP is required)" >&2
  exit 1
fi
major="$1"
work="${RUNNER_TEMP:-/tmp}/capacitor-${major}-host"
rm -rf "$work"
mkdir -p "$work"

npm run build
npm pack --pack-destination "$work"
tarballs=("$work"/tapp-capacitor-sdk-*.tgz)
if [[ ${#tarballs[@]} -ne 1 || ! -f ${tarballs[0]} ]]; then
  echo "Expected one tapp-capacitor-sdk tarball in $work" >&2
  exit 1
fi
tgz="${tarballs[0]}"

mkdir "$work/app"
cd "$work/app"
npm init -y
npm install --no-audit --no-fund "@capacitor/core@^$major" "@capacitor/cli@^$major" "@capacitor/android@^$major" "$tgz"

mkdir www
cat > www/index.html <<'HTML'
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Tapp CI Host</title></head><body>Tapp CI Host</body></html>
HTML
cat > capacitor.config.json <<'JSON'
{"appId":"so.tapp.ci.host","appName":"TappCiHost","webDir":"www"}
JSON

npx cap add android
CAPACITOR_ROOT_DIR="$PWD" node "$repo_root/example-app/scripts/ensure-jitpack.mjs"
sed -E -i 's/minSdkVersion[[:space:]]*=[[:space:]]*[0-9]+/minSdkVersion = 24/' android/variables.gradle
if ! grep -q 'minSdkVersion = 24' android/variables.gradle; then
  echo "Failed to set host minSdkVersion to 24 in android/variables.gradle" >&2
  exit 1
fi
npx cap sync android
if ! grep -q 'jitpack.io' android/build.gradle; then
  echo "JitPack repository missing from host android/build.gradle" >&2
  exit 1
fi
if ! grep -q "':tapp-capacitor-sdk'" android/capacitor.settings.gradle; then
  echo "tapp-capacitor-sdk not included in host capacitor.settings.gradle" >&2
  exit 1
fi

cd android
java -version
./gradlew buildEnvironment --console=plain > "$work/build-environment.txt"
host_agp="$(grep -m1 -oE 'com\.android\.tools\.build:gradle:[0-9][^ ]*' "$work/build-environment.txt" | head -n1 | sed 's/com\.android\.tools\.build:gradle://' || true)"
echo "Host AGP: $host_agp"
if [[ "$host_agp" != "$EXPECTED_HOST_AGP" ]]; then
  echo "Expected host AGP $EXPECTED_HOST_AGP, got $host_agp" >&2
  exit 1
fi
./gradlew assembleDebug --stacktrace
