#!/usr/bin/env bash
set -euo pipefail

apk="${APK_PATH:-android/app/build/outputs/apk/debug/Jornada-90-Manager.apk}"
sha_file="${SHA_FILE:-android/Jornada-90-Manager.apk.sha256}"
info_file="${INFO_FILE:-android/Jornada-90-Manager-release.txt}"

test -f "$apk"
test -f "$sha_file"
test -f "$info_file"
test -n "${GH_TOKEN:-}"
test -n "${GITHUB_REPOSITORY:-}"

bytes=$(stat -c%s "$apk")
local_sha=$(cut -d' ' -f1 "$sha_file")
tag="jornada-90-build-${GITHUB_RUN_NUMBER}"
api="https://api.github.com/repos/${GITHUB_REPOSITORY}"

payload=$(jq -n \
  --arg tag "$tag" \
  --arg target "${GITHUB_SHA}" \
  --arg name "Jornada 90 Manager build ${GITHUB_RUN_NUMBER}" \
  --arg body "Build validada automaticamente. O APK foi auditado e terá tamanho/SHA-256/CRC conferidos antes da publicação." \
  '{tag_name:$tag,target_commitish:$target,name:$name,body:$body,draft:true,prerelease:false}')

# Create the draft release. If this run is a manual retry and the draft already
# exists, reuse it instead of failing on a duplicate tag.
if release_json=$(curl --fail --show-error --silent --location --http1.1 --retry 3 --retry-all-errors \
  -H "Authorization: Bearer ${GH_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  -H "Content-Type: application/json" \
  --data "$payload" "$api/releases"); then
  :
else
  release_json=$(curl --fail --show-error --silent --location --http1.1 --retry 3 --retry-all-errors \
    -H "Authorization: Bearer ${GH_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2026-03-10" \
    "$api/releases/tags/$tag")
fi

release_id=$(printf '%s' "$release_json" | jq -r '.id // empty')
test -n "$release_id"
echo "RELEASE_ID=$release_id"
echo "RELEASE_TAG=$tag"

gh release upload "$tag" "$apk" "$sha_file" "$info_file" --clobber --repo "$GITHUB_REPOSITORY"

assets_json=$(curl --fail --show-error --silent --location --http1.1 --retry 3 --retry-all-errors \
  -H "Authorization: Bearer ${GH_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  "$api/releases/$release_id")

remote_size=$(printf '%s' "$assets_json" | jq -r '.assets[] | select(.name=="Jornada-90-Manager.apk") | .size')
remote_digest=$(printf '%s' "$assets_json" | jq -r '.assets[] | select(.name=="Jornada-90-Manager.apk") | .digest')
remote_state=$(printf '%s' "$assets_json" | jq -r '.assets[] | select(.name=="Jornada-90-Manager.apk") | .state')
test "$remote_state" = "uploaded"
test "$remote_size" -eq "$bytes"
test "$remote_digest" = "sha256:$local_sha"
echo "RELEASE_APK_STATE=uploaded"
echo "RELEASE_APK_SIZE_MATCH=OK"
echo "RELEASE_APK_SHA256_MATCH=OK"

# The release is still a draft. browser_download_url may legitimately return
# 404 here, so validate the exact uploaded asset through its authenticated API URL.
asset_api_url=$(printf '%s' "$assets_json" | jq -r '.assets[] | select(.name=="Jornada-90-Manager.apk") | .url')
test -n "$asset_api_url"
curl --fail --show-error --silent --location --http1.1 --retry 3 --retry-all-errors \
  -H "Authorization: Bearer ${GH_TOKEN}" \
  -H "Accept: application/octet-stream" \
  -o /tmp/Jornada-90-Manager-downloaded.apk "$asset_api_url"
downloaded_size=$(stat -c%s /tmp/Jornada-90-Manager-downloaded.apk)
downloaded_sha=$(sha256sum /tmp/Jornada-90-Manager-downloaded.apk | cut -d' ' -f1)
test "$downloaded_size" -eq "$bytes"
test "$downloaded_sha" = "$local_sha"
unzip -t /tmp/Jornada-90-Manager-downloaded.apk >/tmp/j90-release-download-crc.txt
echo "RELEASE_DRAFT_DOWNLOAD_SIZE_MATCH=OK"
echo "RELEASE_DRAFT_DOWNLOAD_SHA256_MATCH=OK"
echo "RELEASE_DRAFT_DOWNLOAD_CRC=OK"

publish_payload='{"draft":false,"prerelease":false,"make_latest":true}'
curl --fail --show-error --silent --location --http1.1 --retry 3 --retry-all-errors \
  -X PATCH \
  -H "Authorization: Bearer ${GH_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  -H "Content-Type: application/json" \
  --data "$publish_payload" \
  "$api/releases/$release_id" >/dev/null
echo "RELEASE_PUBLISHED=OK"