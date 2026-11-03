#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! $1 =~ ^[0-9]+$ ]]; then
  echo "Usage: $0 <capacitor-major>" >&2
  exit 1
fi
major="$1"
repo_root="$(pwd)"
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
npm install "@capacitor/core@^$major" "@capacitor/cli@^$major" "@capacitor/android@^$major" "$tgz"

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
sed -E -i 's/(minSdkVersion[[:space:]]*=[[:space:]]*)[0-9]+/\124/' android/variables.gradle
grep 'minSdkVersion = 24' android/variables.gradle
npx cap sync android

cd android
java -version
./gradlew :tapp-capacitor-sdk:buildEnvironment --console=plain > "$work/build-environment.txt"
grep -m1 'com.android.tools.build:gradle:' "$work/build-environment.txt"
./gradlew assembleDebug --stacktrace
