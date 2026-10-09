#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
ANDROID_ROOT="$1"
RES="$ANDROID_ROOT/app/src/main/res"
sudo apt-get update -y
sudo apt-get install -y imagemagick
mkdir -p "$ROOT/game-source/web/public" "$RES/mipmap-mdpi" "$RES/mipmap-hdpi" "$RES/mipmap-xhdpi" "$RES/mipmap-xxhdpi" "$RES/mipmap-xxxhdpi" "$RES/mipmap-anydpi-v26" "$RES/drawable-nodpi" "$RES/values"
cp "$ROOT/assets/j90-app-icon.svg" "$ROOT/game-source/web/public/j90-app-icon.svg"
convert -background none "$ROOT/assets/j90-app-icon.svg" -resize 48x48 "$RES/mipmap-mdpi/ic_launcher.png"
convert -background none "$ROOT/assets/j90-app-icon.svg" -resize 72x72 "$RES/mipmap-hdpi/ic_launcher.png"
convert -background none "$ROOT/assets/j90-app-icon.svg" -resize 96x96 "$RES/mipmap-xhdpi/ic_launcher.png"
convert -background none "$ROOT/assets/j90-app-icon.svg" -resize 144x144 "$RES/mipmap-xxhdpi/ic_launcher.png"
convert -background none "$ROOT/assets/j90-app-icon.svg" -resize 192x192 "$RES/mipmap-xxxhdpi/ic_launcher.png"
for d in mipmap-mdpi mipmap-hdpi mipmap-xhdpi mipmap-xxhdpi mipmap-xxxhdpi; do cp "$RES/$d/ic_launcher.png" "$RES/$d/ic_launcher_round.png"; done
convert -background none "$ROOT/assets/j90-icon-foreground.svg" -resize 432x432 "$RES/drawable-nodpi/j90_launcher_foreground.png"
cat > "$RES/mipmap-anydpi-v26/ic_launcher.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/j90_icon_background" />
    <foreground android:drawable="@drawable/j90_launcher_foreground" />
    <monochrome android:drawable="@drawable/j90_launcher_foreground" />
</adaptive-icon>
XML
cp "$RES/mipmap-anydpi-v26/ic_launcher.xml" "$RES/mipmap-anydpi-v26/ic_launcher_round.xml"
cat > "$RES/values/j90_icon_colors.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<resources><color name="j90_icon_background">#071D33</color></resources>
XML
echo "J90_LAUNCHER_ICON_READY=1"
