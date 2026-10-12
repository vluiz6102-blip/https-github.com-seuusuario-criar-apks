#!/usr/bin/env bash
set -uo pipefail

PACKAGE="com.maiasoccermanager.msm"
APK="${MAIA_SMOKE_APK:-artifacts/Maia-Soccer-Manager-arm64.apk}"
LOG="artifacts/android-startup-smoke.log"
SCREEN="artifacts/android-startup-screen.png"
mkdir -p artifacts
: > "$LOG"

{
  echo "Maia Soccer Manager Android launch smoke test"
  echo "Package: $PACKAGE"
  echo "APK under test: $APK"
  echo "Time: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo "Waiting for emulator boot..."
} | tee -a "$LOG"

adb wait-for-device
booted="0"
for attempt in $(seq 1 150); do
  booted="$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')"
  [ "$booted" = "1" ] && break
  sleep 2
done
if [ "$booted" != "1" ]; then
  echo "FAIL: emulator never completed boot after 300 seconds." | tee -a "$LOG"
  adb shell getprop >> "$LOG" 2>&1 || true
  adb logcat -d -v threadtime >> "$LOG" 2>&1 || true
  exit 1
fi

adb logcat -c >/dev/null 2>&1 || true
adb shell settings put global animator_duration_scale 0 >/dev/null 2>&1 || true
adb shell settings put global transition_animation_scale 0 >/dev/null 2>&1 || true
adb shell settings put global window_animation_scale 0 >/dev/null 2>&1 || true

if [ ! -s "$APK" ]; then
  echo "FAIL: APK not found at $APK" | tee -a "$LOG"
  exit 1
fi

echo "Installing APK..." | tee -a "$LOG"
adb install -r "$APK" 2>&1 | tee -a "$LOG"
install_status=${PIPESTATUS[0]}
if [ "$install_status" -ne 0 ]; then
  echo "FAIL: adb install exit code $install_status" | tee -a "$LOG"
  adb logcat -d -v threadtime >> "$LOG" 2>&1 || true
  exit 1
fi

echo "Launching the launcher activity..." | tee -a "$LOG"
adb shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 2>&1 | tee -a "$LOG"
launch_status=${PIPESTATUS[0]}
sleep 12

adb shell screencap -p /sdcard/maia-startup.png >/dev/null 2>&1 || true
adb pull /sdcard/maia-startup.png "$SCREEN" >> "$LOG" 2>&1 || true
adb logcat -d -v threadtime >> "$LOG" 2>&1 || true

pid="$(adb shell pidof "$PACKAGE" 2>/dev/null | tr -d '\r')"
resumed="$(adb shell dumpsys activity activities 2>/dev/null | grep -E 'mResumedActivity|topResumedActivity' | tail -n 1 || true)"
{
  echo
  echo "Launch command exit: $launch_status"
  echo "App PID after 12 seconds: ${pid:-<none>}"
  echo "Resumed activity: ${resumed:-<not reported>}"
  echo "Startup screenshot: $SCREEN"
} | tee -a "$LOG"

if [ "$launch_status" -ne 0 ] || [ -z "$pid" ] || [[ "$resumed" != *"$PACKAGE"* ]]; then
  echo "FAIL: app did not remain running in the foreground for 12 seconds." | tee -a "$LOG"
  echo "--- Last Android startup diagnostics ---"
  tail -n 180 "$LOG"
  exit 1
fi

# Only classify Java crashes as app failures when AndroidRuntime identifies
# our package. Other emulator services (for example Bluetooth) can crash in
# CI and must not cause a false-negative if the game itself stayed alive.
# Filter crash evidence to this app only; emulator services may also crash.
java_crash=0
if grep -A 6 -E "FATAL EXCEPTION" "$LOG" | grep -F -q "Process: $PACKAGE,"; then
  java_crash=1
fi
native_crash=0
if grep -F -q ">>> $PACKAGE <<<" "$LOG" || grep -F -q "Cmdline: $PACKAGE" "$LOG"; then
  native_crash=1
fi
if [ "$java_crash" -eq 1 ] || [ "$native_crash" -eq 1 ] ||
   grep -F -q "Force finishing activity $PACKAGE" "$LOG" ||
   grep -F -q "am_crash: $PACKAGE" "$LOG"; then
  echo "FAIL: Android reported a Java or native crash for $PACKAGE." | tee -a "$LOG"
  tail -n 180 "$LOG"
  exit 1
fi

echo "PASS: package installed, foreground activity stayed alive for 12 seconds." | tee -a "$LOG"
