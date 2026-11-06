package com.apeducation.starmeqa;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.ConsoleMessage;
import android.view.WindowInsets;
import android.widget.FrameLayout;

public class MainActivity extends Activity {
    public WebView web;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage message) {
                android.util.Log.i("StarMeQA", message.message());
                return true;
            }
        });
        web.setWebViewClient(new WebViewClient());
        FrameLayout root = new FrameLayout(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
            view.setPadding(0, bars.top, 0, bars.bottom);
            float keyboard = Math.max(0, insets.getInsets(WindowInsets.Type.ime()).bottom - bars.bottom) / getResources().getDisplayMetrics().density;
            web.evaluateJavascript("document.documentElement?.style.setProperty('--app-keyboard-inset','" + keyboard + "px')", null);
            return insets;
        });
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, () -> {
                if (web.canGoBack()) web.goBack();
                else finish();
            });
        }
        web.loadUrl("http://127.0.0.1:5575/?native=android&session=android-" + java.util.UUID.randomUUID());
    }
    @Override public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
