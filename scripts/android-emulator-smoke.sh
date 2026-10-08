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

# Phase 0 platform baseline. Capture cumulative startup and then reset gfxinfo so
# the post capture isolates the standardized measurement session.
adb shell dumpsys gfxinfo "$PACKAGE" >"$OUT/gfxinfo-before.txt"
adb shell dumpsys meminfo "$PACKAGE" >"$OUT/meminfo-before.txt"
adb shell dumpsys gfxinfo "$PACKAGE" reset || true

PERFETTO_REMOTE=/data/local/tmp/j90-jornada90.perfetto
rm -f "$OUT/perfetto.log" "$OUT/perfetto.trace"
adb shell rm -f "$PERFETTO_REMOTE"
if ! adb shell command -v perfetto >/dev/null 2>&1; then
  echo "PERFETTO_BINARY_MISSING=1"
  exit 1
fi
adb shell "perfetto -o $PERFETTO_REMOTE -t 90s sched freq idle am wm gfx view binder_driver" >"$OUT/perfetto.log" 2>&1 &
PERFETTO_CLIENT_PID=$!
PERFETTO_ACTIVE=1
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
SMOKE_STATUS=0
timeout 120s node scripts/android-cdp-smoke.mjs || SMOKE_STATUS=$?

if [ "${PERFETTO_ACTIVE:-0}" = "1" ]; then
  for p in $(adb shell pidof perfetto 2>/dev/null | tr -d '\\r' || true); do
    adb shell kill -INT "$p" >/dev/null 2>&1 || true
  done
  kill "$PERFETTO_CLIENT_PID" >/dev/null 2>&1 || true
  sleep 2
  adb pull "$PERFETTO_REMOTE" "$OUT/perfetto.trace" >/dev/null 2>&1 || true
  PERFETTO_ACTIVE=0
fi

adb shell dumpsys gfxinfo "$PACKAGE" >"$OUT/gfxinfo-after.txt"
adb shell dumpsys meminfo "$PACKAGE" >"$OUT/meminfo-after.txt"
adb logcat -d -v threadtime >"$OUT/logcat.txt"
tile_warnings=$(grep -E -i -c 'tile_manager\\.cc\\([0-9]+\\).*tile memory limits exceeded|tile memory limits exceeded' "$OUT/logcat.txt" || true)
perfetto_bytes=0
[ -s "$OUT/perfetto.trace" ] && perfetto_bytes=$(stat -c '%s' "$OUT/perfetto.trace" || echo 0)
echo "TILE_MEMORY_WARNINGS=$tile_warnings"
echo "PERFETTO_BYTES=$perfetto_bytes"
python3 - "$OUT" "$tile_warnings" "$perfetto_bytes" <<'PY'
import json, pathlib, sys
out=pathlib.Path(sys.argv[1])
metrics={
  'package':'com.jornada90.manager',
  'tileMemoryWarnings':int(sys.argv[2]),
  'perfettoBytes':int(sys.argv[3]),
  'perfettoTrace':str(out/'perfetto.trace'),
  'gfxinfoBefore':str(out/'gfxinfo-before.txt'),
  'gfxinfoAfter':str(out/'gfxinfo-after.txt'),
  'meminfoBefore':str(out/'meminfo-before.txt'),
  'meminfoAfter':str(out/'meminfo-after.txt'),
  'logcat':str(out/'logcat.txt')
}
result=out/'android-result.json'
if result.exists(): metrics['webviewSmokeResult']=str(result)
(out/'android-platform-metrics.json').write_text(json.dumps(metrics,indent=2),encoding='utf-8')
PY

if [ "$SMOKE_STATUS" -ne 0 ]; then exit "$SMOKE_STATUS"; fi

if grep -E -i 'FATAL EXCEPTION|ANR in|Fatal signal [0-9]|SIGSEGV|SIGABRT|OutOfMemoryError' "$OUT/logcat.txt" >/tmp/j90-fatal.txt; then
  echo "Fatal Android runtime signatures detected:"
  cat /tmp/j90-fatal.txt
  exit 1
fi

echo "ANDROID_APK_SMOKE=OK"
