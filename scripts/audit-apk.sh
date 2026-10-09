#!/usr/bin/env bash
set -euo pipefail

apk="${APK_PATH:-app/build/outputs/apk/debug/Jornada-90-Manager.apk}"
sha_file="${SHA_FILE:-Jornada-90-Manager.apk.sha256}"
info_file="${INFO_FILE:-Jornada-90-Manager-release.txt}"

if [[ ! -f "$apk" ]]; then
  echo "APK_AUDIT_ERROR=APK_NOT_FOUND: $apk" >&2
  exit 1
fi

bytes=$(stat -c%s "$apk")
mib=$(awk -v b="$bytes" 'BEGIN{printf "%.2f", b/1048576}')
echo "APK_SIZE_BYTES=$bytes"
echo "APK_SIZE_MIB=$mib"

(( bytes >= 60 * 1024 * 1024 ))

# 1) APK ZIP integrity, including every entry CRC.
unzip -t "$apk" >/tmp/j90-unzip-test.txt

# 2) Minimum APK structure.
# Save the listing once. Piping unzip directly to grep -q can make grep close
# early, causing unzip to receive SIGPIPE (141) under set -o pipefail.
apk_listing=/tmp/j90-apk-listing.txt
unzip -l "$apk" > "$apk_listing"
grep -q 'AndroidManifest.xml' "$apk_listing"
grep -q 'resources.arsc' "$apk_listing"
grep -q 'classes.dex' "$apk_listing"
grep -q 'j90-content/content-manifest.json' "$apk_listing"
if grep -q 'j90-content/players/' "$apk_listing"; then
  echo "PLAYER_PHOTOS_DIRECTORY_DETECTED" >&2
  exit 1
fi

# 3) Android SDK integrity checks.
build_tools=$(find "$ANDROID_HOME/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -n1)
test -n "$build_tools"
"$build_tools/zipalign" -c -v 4 "$apk" >/tmp/j90-zipalign.txt
"$build_tools/apksigner" verify --verbose --print-certs "$apk" >/tmp/j90-apksigner.txt
"$build_tools/aapt2" dump badging "$apk" >/tmp/j90-badging.txt
grep -q "package: name='com.jornada90.manager'" /tmp/j90-badging.txt
grep -q "application-label:'Jornada 90 Manager'" /tmp/j90-badging.txt

# 4) Local digest and release metadata.
sha256sum "$apk" | tee "$sha_file"
local_sha=$(cut -d' ' -f1 "$sha_file")
{
  echo "APK=Jornada-90-Manager.apk"
  echo "SIZE_BYTES=$bytes"
  echo "SIZE_MIB=$mib"
  echo "SHA256=$local_sha"
  echo "RUN=${GITHUB_RUN_NUMBER:-local}"
  echo "COMMIT=${GITHUB_SHA:-local}"
} | tee "$info_file"

(( bytes < 300 * 1024 * 1024 ))
echo "APK_UNDER_300_MIB=OK"
echo "APK_FORENSICS=OK"
echo "ZIP_INTEGRITY=OK"
echo "ZIPALIGN=OK"
echo "SIGNATURE=OK"
echo "MANIFEST=OK"
echo "SHA256_READY=OK"
