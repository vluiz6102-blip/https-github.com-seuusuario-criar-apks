package com.jornada90.carreira;

import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(J90DisplayRatePlugin.class);
    registerPlugin(J90HapticsPlugin.class);
    super.onCreate(savedInstanceState);

    // Prefer 120 Hz from the moment the WebView is created. The plugin still
    // negotiates the closest supported mode when the user changes the setting.
    getWindow().setAttributes(withPreferredRefreshRate(getWindow().getAttributes(), 120f));
  }

  private WindowManager.LayoutParams withPreferredRefreshRate(WindowManager.LayoutParams lp, float hz) {
    lp.preferredRefreshRate = hz;
    return lp;
  }
}
