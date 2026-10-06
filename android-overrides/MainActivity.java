package com.jornada90.manager;

import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.Window;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(J90DisplayRatePlugin.class);
    registerPlugin(J90HapticsPlugin.class);
    super.onCreate(savedInstanceState);

    // Game-style edge-to-edge + immersive bars. The WebView occupies the complete display.
    getWindow().setStatusBarColor(Color.TRANSPARENT);
    getWindow().setNavigationBarColor(Color.TRANSPARENT);
    applyImmersiveMode();

    // Ask Android for a high refresh rate when the device has enough CPU headroom.
    getWindow().setAttributes(withPreferredRefreshRate(getWindow().getAttributes(), chooseStartupRefreshRate()));
  }

  private WindowManager.LayoutParams withPreferredRefreshRate(WindowManager.LayoutParams lp, float hz) {
    lp.preferredRefreshRate = hz;
    return lp;
  }
}
