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

    // Prefer 120 Hz from the moment the WebView is created. The plugin still
    // negotiates the closest supported mode when the user changes the setting.
    getWindow().setAttributes(withPreferredRefreshRate(getWindow().getAttributes(), 120f));
  }

  private WindowManager.LayoutParams withPreferredRefreshRate(WindowManager.LayoutParams lp, float hz) {
    lp.preferredRefreshRate = hz;
    return lp;
  }
}
