package com.jornada90.manager;

import android.os.Bundle;
import android.os.Build;
import android.content.res.Configuration;
import android.graphics.Color;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(J90DisplayRatePlugin.class);
    registerPlugin(J90HapticsPlugin.class);
    registerPlugin(J90ExternalBrowserPlugin.class);
    super.onCreate(savedInstanceState);

    // Explicit hardware acceleration + WebView settings for the 2D/WebGL game surface.
    getWindow().setFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED, WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
    WebView webView = getBridge().getWebView();
    if (webView != null) {
      WebSettings settings = webView.getSettings();
      settings.setJavaScriptEnabled(true);
      settings.setDomStorageEnabled(true);
      settings.setDatabaseEnabled(true);
      settings.setMediaPlaybackRequiresUserGesture(false);
      if ((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);
      webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
      webView.setBackgroundColor(Color.BLACK);
    }

    // Game-style edge-to-edge + immersive bars. The WebView occupies the complete display.
    getWindow().setStatusBarColor(Color.TRANSPARENT);
    getWindow().setNavigationBarColor(Color.TRANSPARENT);
    applyImmersiveMode();

    // Ask Android for a high refresh rate when the device has enough CPU headroom.
    getWindow().setAttributes(withPreferredRefreshRate(getWindow().getAttributes(), chooseStartupRefreshRate()));
  }

  @Override
  public void onConfigurationChanged(Configuration newConfig) {
    super.onConfigurationChanged(newConfig);
    applyImmersiveMode();
    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
    if (webView != null) webView.requestLayout();
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus) applyImmersiveMode();
  }

  private WindowManager.LayoutParams withPreferredRefreshRate(WindowManager.LayoutParams lp, float hz) {
    lp.preferredRefreshRate = hz;
    return lp;
  }

  private float chooseStartupRefreshRate() {
    int cores = Math.max(1, Runtime.getRuntime().availableProcessors());
    if (cores < 6) return 60f;
    if (Build.VERSION.SDK_INT >= 23) {
      android.view.Display display = getWindow().getWindowManager().getDefaultDisplay();
      if (display != null) {
        float best = 60f;
        for (android.view.Display.Mode mode : display.getSupportedModes()) {
          float hz = mode.getRefreshRate();
          if (hz >= 90f && hz <= 120f && hz > best) best = hz;
        }
        return best;
      }
    }
    return 60f;
  }

  private void applyImmersiveMode() {
    View decor = getWindow().getDecorView();
    if (Build.VERSION.SDK_INT >= 30) {
      WindowInsetsController controller = decor.getWindowInsetsController();
      if (controller != null) {
        controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
      }
    } else {
      decor.setSystemUiVisibility(
        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
        View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
        View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
        View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
        View.SYSTEM_UI_FLAG_FULLSCREEN |
        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
      );
    }
  }

}
