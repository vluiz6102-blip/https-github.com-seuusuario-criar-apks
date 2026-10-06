package com.jornada90.carreira;

import android.os.Build;
import android.view.Window;
import android.view.WindowManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "J90DisplayRate")
public class J90DisplayRatePlugin extends Plugin {
  @PluginMethod
  public void setRate(PluginCall call) {
    double rate = call.getDouble("rate", 60.0);
    if (rate != 30.0 && rate != 60.0 && rate != 120.0 && rate != 144.0) rate = 60.0;
    final double requested = rate;
    getActivity().runOnUiThread(() -> {
      Window w = getActivity().getWindow();
      double applied = requested;
      if (Build.VERSION.SDK_INT >= 21) {
        WindowManager.LayoutParams lp = w.getAttributes();
        if (Build.VERSION.SDK_INT >= 23 && getActivity().getDisplay() != null) {
          android.view.Display.Mode[] modes = getActivity().getDisplay().getSupportedModes();
          if (modes != null && modes.length > 0) {
            double best = modes[0].getRefreshRate();
            double distance = Math.abs(best - requested);
            for (android.view.Display.Mode mode : modes) {
              double hz = mode.getRefreshRate();
              double d = Math.abs(hz - requested);
              if (d < distance) { best = hz; distance = d; }
            }
            applied = best;
          }
        }
        lp.preferredRefreshRate = (float) applied;
        w.setAttributes(lp);
      }
      JSObject ret = new JSObject();
      ret.put("requestedHz", requested);
      ret.put("appliedHz", applied);
      ret.put("supportedBySystemHint", Build.VERSION.SDK_INT >= 21);
      call.resolve(ret);
    });
  }
}
