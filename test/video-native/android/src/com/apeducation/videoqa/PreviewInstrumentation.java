package com.apeducation.videoqa;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.MotionEvent;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import android.graphics.Bitmap;
import java.io.File;
import java.io.FileOutputStream;

public class PreviewInstrumentation extends Instrumentation {
    MainActivity activity;
    ArrayList<String> passed = new ArrayList<>();
    @Override public void onCreate(Bundle arguments) { super.onCreate(arguments); start(); }
    String js(String expression) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        runOnMainSync(() -> activity.web.evaluateJavascript(expression, value -> { result.set(value); latch.countDown(); }));
        if (!latch.await(20, TimeUnit.SECONDS)) throw new AssertionError("WebView evaluation timeout");
        return result.get();
    }
    void expect(String expression, String label) throws Exception {
        long until = System.currentTimeMillis() + 30000;
        while (System.currentTimeMillis() < until) {
            if ("true".equals(js("Boolean(" + expression + ")"))) { passed.add(label); return; }
            Thread.sleep(250);
        }
        throw new AssertionError(label + " failed");
    }
    void click(String label) throws Exception {
        js("document.querySelector('button[aria-label=\"" + label + "\"]').click()");
    }
    void tap(String label) throws Exception {
        String match = JSONObject.quote(label);
        JSONObject point = new JSONObject(js("(() => { const button = [...document.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === " + match + " || button.textContent.trim() === " + match + "); const box = button.getBoundingClientRect(); return {x: box.x + box.width / 2, y: box.y + box.height / 2}; })()"));
        int[] screen = new int[3];
        runOnMainSync(() -> { activity.web.getLocationOnScreen(screen); screen[2] = activity.web.getWidth(); });
        double scale = screen[2] / Double.parseDouble(js("innerWidth"));
        float x = (float) (screen[0] + point.getDouble("x") * scale);
        float y = (float) (screen[1] + point.getDouble("y") * scale);
        long now = SystemClock.uptimeMillis();
        MotionEvent down = MotionEvent.obtain(now, now, MotionEvent.ACTION_DOWN, x, y, 0);
        MotionEvent up = MotionEvent.obtain(now, now + 50, MotionEvent.ACTION_UP, x, y, 0);
        sendPointerSync(down);
        sendPointerSync(up);
        down.recycle();
        up.recycle();
    }
    void load(String query) { runOnMainSync(() -> activity.web.loadUrl("http://10.0.2.2:5568/?chat&" + query.substring(1))); }
    void screenshot(String name) throws Exception {
        js("window.qaPaintReady = false; requestAnimationFrame(() => requestAnimationFrame(() => { window.qaPaintReady = true; }));");
        long deadline = System.currentTimeMillis() + 10000;
        while (!"true".equals(js("window.qaPaintReady"))) {
            if (System.currentTimeMillis() > deadline) throw new AssertionError("Frame not painted");
            Thread.sleep(100);
        }
        getUiAutomation().waitForIdle(100, 3000);
        try (FileOutputStream output = new FileOutputStream(new File(getTargetContext().getFilesDir(), name + ".png"))) {
            getUiAutomation().takeScreenshot().compress(Bitmap.CompressFormat.PNG, 100, output);
        }
    }
    @Override public void onStart() {
        Bundle result = new Bundle();
        try {
            Intent intent = new Intent().setClassName(getTargetContext(), "com.apeducation.videoqa.MainActivity").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity = (MainActivity) startActivitySync(intent);
            expect("document.querySelector('img[alt^=\"Кадр відео\"]')?.naturalWidth === 320", "landscape poster decoded");
            expect("!document.querySelector('video')", "no inline original video");
            expect("document.querySelector('[aria-label=\"Тривалість 0:02\"]')", "duration displayed");
            expect("document.querySelector('#message-message time') && document.querySelector('[role=log]') && document.querySelector('[contenteditable=true]')", "real chat row, timestamp and composer rendered");
            screenshot("android-chat");
            tap("Відкрити відео Зустріч команди.mp4");
            expect("document.querySelector('video')?.readyState >= 2", "viewer video decoded");
            if ("true".equals(js("Boolean(document.querySelector('button[aria-label=\"Відтворити відео\"]'))"))) tap("Відтворити відео");
            expect("document.querySelector('video')?.currentTime > 0", "video actually played after a native touch");
            screenshot("android-player");
            click("Закрити");
            expect("!document.querySelector('video')", "closing removes player");
            load("?nocaption");
            expect("location.search.includes('nocaption') && document.querySelector('#message-message [data-media-key] time')", "timestamp is over the captionless video");
            expect("!document.querySelector('#message-message')?.textContent.includes('Зустріч команди.mp4')", "no duplicate file card below the poster");
            expect("document.querySelector('#message-message button[aria-label^=\"Завантажити\"]')?.getBoundingClientRect().height >= 44", "download has a full touch target");
            expect("document.querySelector('#message-message img[alt^=\"Кадр відео\"]')?.naturalWidth === 320", "captionless poster decoded");
            screenshot("android-compact-chat");
            load("?portrait");
            expect("location.search.includes('portrait') && document.querySelector('img[alt^=\"Кадр відео\"]')?.naturalWidth === 180", "portrait poster decoded");
            screenshot("android-portrait-chat");
            expect("document.documentElement.scrollWidth <= innerWidth", "portrait fits viewport");
            tap("Відкрити відео Зустріч команди.mp4");
            expect("document.querySelector('video')?.readyState >= 2", "portrait viewer decoded");
            expect("(() => { const video = document.querySelector('video')?.getBoundingClientRect(); const header = document.querySelector('[role=dialog] header')?.getBoundingClientRect(); const footer = document.querySelector('[role=dialog] footer')?.getBoundingClientRect(); return video && header && footer && video.top >= header.bottom && video.bottom <= footer.top; })()", "portrait playback controls clear the caption and header");
            screenshot("android-portrait-player");
            click("Закрити");
            expect("!document.querySelector('video')", "portrait closes back into chat");
            load("?legacy");
            expect("location.search.includes('legacy') && document.querySelector('button[aria-label^=\"Відтворити\"]') && !document.querySelector('img[alt^=\"Кадр відео\"]')", "legacy file card preserved");
            click("Відтворити Зустріч команди.mp4");
            expect("document.querySelector('video')?.readyState >= 2", "legacy video decoded");
            result.putString("stream", "\nPASS " + passed.toString() + "\n");
            finish(Activity.RESULT_OK, result);
        } catch (Throwable error) {
            result.putString("stream", "\nFAIL " + error.toString() + " after " + passed.toString() + "\n");
            finish(Activity.RESULT_CANCELED, result);
        }
    }
}
