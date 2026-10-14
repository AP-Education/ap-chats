package expo.modules.keyboardframe

import android.graphics.Rect
import android.view.View
import android.view.ViewTreeObserver
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class KeyboardFrameModule : Module() {
  private var observed: View? = null
  private var lastHeight = -1.0

  private val layoutListener = ViewTreeObserver.OnGlobalLayoutListener {
    val height = visibleHeight()
    if (height == lastHeight) return@OnGlobalLayoutListener

    lastHeight = height
    sendEvent("onChange", mapOf("height" to height))
  }

  override fun definition() = ModuleDefinition {
    Name("KeyboardFrame")

    Events("onChange")

    Function("visibleHeight") { visibleHeight() }

    OnStartObserving {
      val decor = appContext.currentActivity?.window?.decorView ?: return@OnStartObserving
      decor.post {
        observed = decor
        decor.viewTreeObserver.addOnGlobalLayoutListener(layoutListener)
      }
    }

    OnStopObserving {
      val decor = observed ?: return@OnStopObserving
      decor.post { decor.viewTreeObserver.removeOnGlobalLayoutListener(layoutListener) }
      observed = null
      lastHeight = -1.0
    }
  }

  // The window's visible frame, unlike the IME insets, counts the row some keyboards draw above
  // their keys (Samsung's toolbar and suggestions). It needs a soft input mode other than
  // adjustNothing to account for the keyboard at all.
  private fun visibleHeight(): Double {
    val decor = appContext.currentActivity?.window?.decorView ?: return 0.0
    val frame = Rect()
    decor.getWindowVisibleDisplayFrame(frame)
    val covered = (decor.height - frame.bottom).coerceAtLeast(0)
    return covered / decor.resources.displayMetrics.density.toDouble()
  }
}
