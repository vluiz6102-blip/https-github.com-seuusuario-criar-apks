package com.jornada90.carreira;

import android.os.Build;
import android.view.HapticFeedbackConstants;
import android.view.View;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "J90Haptics")
public class J90HapticsPlugin extends Plugin {
  @PluginMethod
  public void impact(PluginCall call) {
    String type = call.getString("type", "click");
    getActivity().runOnUiThread(() -> {
      View target = getActivity().getWindow().getDecorView();
      target.setHapticFeedbackEnabled(true);

      int constant = HapticFeedbackConstants.VIRTUAL_KEY;
      if ("wrong".equals(type) || "injury".equals(type)) {
        constant = Build.VERSION.SDK_INT >= 30
            ? HapticFeedbackConstants.REJECT
            : HapticFeedbackConstants.LONG_PRESS;
      } else if ("start".equals(type) || "goal".equals(type) || "trophy".equals(type) || "transfer".equals(type)) {
        constant = Build.VERSION.SDK_INT >= 30
            ? HapticFeedbackConstants.CONFIRM
            : HapticFeedbackConstants.LONG_PRESS;
      } else if ("card".equals(type) || "whistle".equals(type)) {
        constant = HapticFeedbackConstants.CLOCK_TICK;
      }

      boolean performed = target.performHapticFeedback(constant);
      if (!performed && constant != HapticFeedbackConstants.VIRTUAL_KEY) {
        performed = target.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
      }

      JSObject ret = new JSObject();
      ret.put("performed", performed);
      ret.put("type", type);
      call.resolve(ret);
    });
  }
}
