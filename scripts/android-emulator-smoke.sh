#!/usr/bin/env bash
set -euo pipefail

APK="android/app/build/outputs/apk/debug/Jornada-90-Manager.apk"
PACKAGE="com.jornada90.manager"
OUT="${RUNNER_TEMP:-/tmp}/j90-android-smoke"
mkdir -p "$OUT"

test -s "$APK"
adb wait-for-device
adb shell getprop sys.boot_completed | grep -q '^1$'

echo "ANDROID_DEVICE=$(adb shell getprop ro.product.model | tr -d '\r')"
echo "ANDROID_API=$(adb shell getprop ro.build.version.sdk | tr -d '\r')"
adb install -r "$APK"
adb shell am force-stop "$PACKAGE"
adb logcat -c
adb shell monkey -p "$PACKAGE" 1 >/tmp/j90-monkey.txt 2>&1

sleep 4
adb shell dumpsys activity activities >"$OUT/activity.txt"
grep -q "$PACKAGE" "$OUT/activity.txt"
adb exec-out screencap -p >"$OUT/startup.png"

PORT=9222
SELECTED_SOCKET=""
rm -f "$OUT/cdp-version.json" "$OUT/cdp-list.json"

# WebView DevTools is created asynchronously after the renderer process starts.
# Poll for up to 30s instead of failing on the first transient probe.
for attempt in $(seq 1 30); do
  SOCKET_LIST="$(adb shell cat /proc/net/unix | tr -d '\r' | awk '{print $8}' | grep -E '@webview_devtools_remote_[0-9]+$' | sort -u || true)"
  echo "WEBVIEW_DEVTOOLS_SOCKETS_ATTEMPT_${attempt}=${SOCKET_LIST:-none}"

  while IFS= read -r raw_socket; do
    [ -n "$raw_socket" ] || continue
    socket="${raw_socket#@}"
    adb forward --remove tcp:$PORT >/dev/null 2>&1 || true
    if ! adb forward tcp:$PORT "localabstract:$socket" >/dev/null 2>&1; then
      echo "WEBVIEW_CDP_FORWARD_FAILED=$socket"
      continue
    fi
    if curl --fail --silent --show-error --connect-timeout 1 --max-time 2 "http://127.0.0.1:$PORT/json/version" -o "$OUT/cdp-version.json"; then
      SELECTED_SOCKET="$socket"
      echo "WEBVIEW_CDP_SOCKET_SELECTED=$socket"
      cat "$OUT/cdp-version.json"
      break 2
    fi
    echo "WEBVIEW_CDP_PROBE_FAILED=$socket"
  done <<< "$SOCKET_LIST"
  sleep 1
done

test -n "$SELECTED_SOCKET" || {
  echo "No WebView DevTools socket answered /json/version after 30s."
  adb shell dumpsys webviewupdate || true
  adb logcat -d -v time >"$OUT/logcat.txt"
  grep -E -i 'FATAL EXCEPTION|AndroidRuntime|ANR|chromium|WebView|DevTools' "$OUT/logcat.txt" | tail -250 || true
  exit 1
}

curl --fail --silent --show-error --connect-timeout 1 --max-time 3 "http://127.0.0.1:$PORT/json/list" -o "$OUT/cdp-list.json"
cat "$OUT/cdp-list.json"

export J90_ANDROID_SMOKE_OUT="$OUT"
timeout 120s node scripts/android-cdp-smoke.mjs

adb logcat -d -v threadtime >"$OUT/logcat.txt"
if grep -E -i 'FATAL EXCEPTION|ANR in|Fatal signal [0-9]|SIGSEGV|SIGABRT|OutOfMemoryError' "$OUT/logcat.txt" >/tmp/j90-fatal.txt; then
  echo "Fatal Android runtime signatures detected:"
  cat /tmp/j90-fatal.txt
  exit 1
fi

echo "ANDROID_APK_SMOKE=OK"
