package com.apeducation.searchqa;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.InputDevice;
import android.view.accessibility.AccessibilityNodeInfo;
import android.view.inputmethod.InputMethodManager;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.view.accessibility.AccessibilityWindowInfo;
import android.graphics.Bitmap;
import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;

public class SearchInstrumentation extends Instrumentation {
    MainActivity activity;
    ArrayList<String> passed = new ArrayList<>();
    @Override public void onCreate(Bundle args) { super.onCreate(args); start(); }
    String js(String expression) throws Exception {
        CountDownLatch ready = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        runOnMainSync(() -> activity.web.evaluateJavascript(expression, value -> { result.set(value); ready.countDown(); }));
        if (!ready.await(15, TimeUnit.SECONDS)) throw new AssertionError("WebView timed out");
        return result.get();
    }
    void expect(String expression, String label) throws Exception {
        long until = SystemClock.uptimeMillis() + 30000;
        while (SystemClock.uptimeMillis() < until) {
            if ("true".equals(js("Boolean(" + expression + ")"))) { passed.add(label); return; }
            Thread.sleep(100);
        }
        throw new AssertionError(label);
    }
    void tap(String selector) throws Exception {
        String quoted = JSONObject.quote(selector);
        JSONObject point = new JSONObject(js("(() => { const element = document.querySelector(" + quoted + "); const box = element.getBoundingClientRect(); return {x:box.x+box.width/2,y:box.y+box.height/2}; })()"));
        int[] origin = new int[3];
        runOnMainSync(() -> { activity.web.getLocationOnScreen(origin); origin[2] = activity.web.getWidth(); });
        double scale = origin[2] / Double.parseDouble(js("innerWidth"));
        float x = (float) (origin[0] + point.getDouble("x") * scale);
        float y = (float) (origin[1] + point.getDouble("y") * scale);
        long now = SystemClock.uptimeMillis();
        MotionEvent.PointerProperties finger = new MotionEvent.PointerProperties();
        finger.id = 0;
        finger.toolType = MotionEvent.TOOL_TYPE_FINGER;
        MotionEvent.PointerCoords pointOnScreen = new MotionEvent.PointerCoords();
        pointOnScreen.x = x; pointOnScreen.y = y; pointOnScreen.pressure = 1; pointOnScreen.size = 1;
        MotionEvent.PointerProperties[] fingers = { finger };
        MotionEvent.PointerCoords[] points = { pointOnScreen };
        MotionEvent down = MotionEvent.obtain(now, now, MotionEvent.ACTION_DOWN, 1, fingers, points, 0, 0, 1, 1, 0, 0, InputDevice.SOURCE_TOUCHSCREEN, 0);
        MotionEvent up = MotionEvent.obtain(now, now + 50, MotionEvent.ACTION_UP, 1, fingers, points, 0, 0, 1, 1, 0, 0, InputDevice.SOURCE_TOUCHSCREEN, 0);
        sendPointerSync(down); sendPointerSync(up); down.recycle(); up.recycle();
    }
    void keyboardReady() throws Exception {
        waitForIdleSync();
        getUiAutomation().waitForIdle(150, 5000);
        AccessibilityNodeInfo root = getUiAutomation().getRootInActiveWindow();
        AccessibilityServiceInfo service = getUiAutomation().getServiceInfo();
        service.flags |= AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
        getUiAutomation().setServiceInfo(service);
        // Some fresh API 36 emulator keyboards open a handwriting tutorial before accepting input.
        if (root != null && !root.findAccessibilityNodeInfosByText("Try out your stylus").isEmpty()) {
            for (AccessibilityNodeInfo node : root.findAccessibilityNodeInfosByText("Cancel")) {
                if ("Cancel".contentEquals(node.getText())) {
                    if (!node.performAction(AccessibilityNodeInfo.ACTION_CLICK) && node.getParent() != null)
                        node.getParent().performAction(AccessibilityNodeInfo.ACTION_CLICK);
                }
            }
            getUiAutomation().waitForIdle(150, 5000);
        }
        for (AccessibilityWindowInfo window : getUiAutomation().getWindows()) {
            AccessibilityNodeInfo windowRoot = window.getRoot();
            if (windowRoot == null || windowRoot.findAccessibilityNodeInfosByText("Try out your stylus").isEmpty()) continue;
            for (AccessibilityNodeInfo node : windowRoot.findAccessibilityNodeInfosByText("Cancel")) {
                AccessibilityNodeInfo target = node;
                while (target != null && !target.isClickable()) target = target.getParent();
                if (target != null) target.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            }
        }
        getUiAutomation().waitForIdle(150, 5000);
    }
    void screenshot(String name) throws Exception {
        getUiAutomation().waitForIdle(100, 3000);
        try (FileOutputStream output = new FileOutputStream(new File(getTargetContext().getFilesDir(), name + ".png"))) {
            getUiAutomation().takeScreenshot().compress(Bitmap.CompressFormat.PNG, 100, output);
        }
    }
    void hideKeyboard() throws Exception {
        runOnMainSync(() -> ((InputMethodManager) activity.getSystemService(Activity.INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(activity.web.getWindowToken(), 0));
        long deadline = SystemClock.uptimeMillis() + 5000;
        while (true) {
            AtomicReference<Boolean> visible = new AtomicReference<>(false);
            runOnMainSync(() -> visible.set(activity.web.getRootWindowInsets().isVisible(android.view.WindowInsets.Type.ime())));
            if (!visible.get()) return;
            if (SystemClock.uptimeMillis() > deadline) throw new AssertionError("Keyboard did not hide");
            Thread.sleep(50);
        }
    }
    void typeQuery(String text) throws Exception {
        String expected = "";
        for (char character : text.toCharArray()) {
            String value = String.valueOf(character);
            // Use WebView's public IME input connection rather than synthetic hardware key codes.
            runOnMainSync(() -> {
                InputConnection connection = activity.web.onCreateInputConnection(new EditorInfo());
                if (connection == null || !connection.commitText(value, 1)) throw new AssertionError("No active WebView input connection");
            });
            expected += character;
            String condition = "document.querySelector('input[role=combobox]')?.value === " + JSONObject.quote(expected);
            long deadline = SystemClock.uptimeMillis() + 5000;
            while (!"true".equals(js(condition))) {
                if (SystemClock.uptimeMillis() > deadline) throw new AssertionError("Native character was not committed: " + expected);
                Thread.sleep(50);
            }
        }
    }
    @Override public void onStart() {
        Bundle result = new Bundle();
        try {
            activity = (MainActivity) startActivitySync(new Intent().setClassName(getTargetContext(), "com.apeducation.searchqa.MainActivity").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            expect("document.querySelector('button[aria-label=\"Відкрити пошук людей і чатів\"]')", "search entry rendered");
            tap("button[aria-label=\"Відкрити пошук людей і чатів\"]");
            expect("document.querySelector('[role=dialog]') && document.activeElement?.getAttribute('role') === 'combobox'", "search opens and focuses input");
            tap("input[role=combobox]");
            keyboardReady();
            typeQuery("design");
            expect("document.querySelector('input[role=combobox]')?.value === 'design'", "native keyboard inserted the query");
            expect("document.querySelectorAll('[role=option]').length === 3", "native typing returns all three result groups");
            expect("document.documentElement.scrollWidth <= innerWidth", "search fits phone width");
            screenshot("android-search-keyboard");
            hideKeyboard();
            tap("[role=option]");
            expect("location.pathname === '/channels/design' && !document.querySelector('[role=dialog]')", "native touch opens channel");
            tap("button[aria-label=\"Відкрити пошук людей і чатів\"]");
            expect("document.querySelector('input[role=combobox]')?.value === ''", "reopening starts with an empty query");
            hideKeyboard();
            sendKeyDownUpSync(KeyEvent.KEYCODE_BACK);
            expect("!document.querySelector('[role=dialog]') && location.pathname === '/channels/design'", "system Back returns to the same channel");
            tap("button[aria-label=\"Відкрити пошук людей і чатів\"]");
            expect("document.querySelector('input[role=combobox]')", "search can reopen after Back");
            tap("input[role=combobox]");
            keyboardReady();
            typeQuery("design");
            expect("document.querySelectorAll('[role=option]').length === 3", "search still works after Back");
            hideKeyboard();
            js("document.querySelector('[role=option]:last-child')?.scrollIntoView({block:'center'})");
            tap("[role=group][aria-label=\"Люди\"] [role=option]");
            expect("location.pathname === '/direct/dm-opened'", "native touch opens a person's DM");
            screenshot("android-search-destination");
            result.putString("stream", "\nPASS " + passed + "\n");
            finish(Activity.RESULT_OK, result);
        } catch (Throwable error) {
            String detail = "";
            try {
                detail = js("JSON.stringify({query:document.querySelector('input[role=combobox]')?.value,active:document.activeElement?.outerHTML,text:document.body.innerText})");
                screenshot("android-search-failure");
            } catch (Throwable ignored) { }
            result.putString("stream", "\nFAIL " + error + " after " + passed + "\n" + detail + "\n");
            finish(Activity.RESULT_CANCELED, result);
        }
    }
}
