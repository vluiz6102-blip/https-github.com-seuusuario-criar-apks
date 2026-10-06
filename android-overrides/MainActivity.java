package com.jornada90.manager;

import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(J90DisplayRatePlugin.class);
    registerPlugin(J90HapticsPlugin.class);
    super.onCreate(savedInstanceState);

    // Edge-to-edge: the WebView fills curved and flat displays while CSS safe-area insets protect controls.
    getWindow().setStatusBarColor(Color.TRANSPARENT);
    getWindow().setNavigationBarColor(Color.TRANSPARENT);
    getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);

    // Start at 60 Hz to avoid forcing high-refresh rendering during WebView startup.
    // The in-game setting can request 120/144 Hz after the UI is ready.
    getWindow().setAttributes(withPreferredRefreshRate(getWindow().getAttributes(), 60f));
  }

  private WindowManager.LayoutParams withPreferredRefreshRate(WindowManager.LayoutParams lp, float hz) {
    lp.preferredRefreshRate = hz;
    return lp;
  }
}
