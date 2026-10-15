package expo.modules.pageframe

import android.annotation.TargetApi
import android.os.Build
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.webkit.WebView
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PageFrameModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PageFrame")

    AsyncFunction("bottomGap") {
      val window = appContext.currentActivity?.window?.decorView ?: return@AsyncFunction 0.0
      val page = findPage(window) ?: return@AsyncFunction 0.0

      val windowTop = IntArray(2).also(window::getLocationOnScreen)[1]
      val pageTop = IntArray(2).also(page::getLocationOnScreen)[1]
      val gap = windowTop + window.height - (pageTop + page.height)
      gap.coerceAtLeast(0) / page.resources.displayMetrics.density.toDouble()
    }.runOnQueue(Queues.MAIN)

    // Native keeps the page clear of the system bars and pads it for the keyboard itself. A WebView
    // that reads the window's insets (Chromium M144+) would add the bars again as its safe area and
    // shrink itself for the keyboard, so it gets none.
    AsyncFunction("clearInsets") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return@AsyncFunction null
      val window = appContext.currentActivity?.window?.decorView ?: return@AsyncFunction null
      val page = findPage(window) ?: return@AsyncFunction null

      page.setOnApplyWindowInsetsListener(::withoutInsets)
      page.requestApplyInsets()
      null
    }.runOnQueue(Queues.MAIN)
  }

  private fun findPage(view: View): WebView? =
    when (view) {
      is WebView -> view.takeIf { it.isAttachedToWindow }
      is ViewGroup -> (0 until view.childCount).firstNotNullOfOrNull { findPage(view.getChildAt(it)) }
      else -> null
    }

  @TargetApi(Build.VERSION_CODES.Q)
  private fun withoutInsets(view: View, @Suppress("UNUSED_PARAMETER") insets: WindowInsets): WindowInsets =
    view.onApplyWindowInsets(WindowInsets.Builder().build())
}
