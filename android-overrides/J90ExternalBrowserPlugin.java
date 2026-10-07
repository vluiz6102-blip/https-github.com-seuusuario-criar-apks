package com.jornada90.manager;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "J90ExternalBrowser")
public class J90ExternalBrowserPlugin extends Plugin {
  private static final String HOST = "buymeacoffee.com";
  private static final String WWW_HOST = "www.buymeacoffee.com";

  @PluginMethod
  public void open(PluginCall call) {
    String raw = call.getString("url", "");
    Uri uri;
    try {
      uri = Uri.parse(raw);
    } catch (Exception e) {
      call.reject("Invalid URL");
      return;
    }

    String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
    String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();

    if (!"https".equals(scheme) || uri.getUserInfo() != null ||
        !(HOST.equals(host) || WWW_HOST.equals(host))) {
      call.reject("Blocked external URL");
      return;
    }

    try {
      Intent intent = new Intent(Intent.ACTION_VIEW, uri);
      intent.addCategory(Intent.CATEGORY_BROWSABLE);
      getActivity().startActivity(intent);
      call.resolve();
    } catch (Exception e) {
      call.reject("No browser available", e);
    }
  }
}
