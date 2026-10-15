package expo.modules.callwindow

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import java.lang.ref.WeakReference

/**
 * A call alone in its window, drawn by the "call" component from the app's own JS runtime.
 * It may be what keeps the call's JS going, so it only steps back until the call ends.
 */
class CallActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
    shown = WeakReference(this)
  }

  override fun onDestroy() {
    if (shown?.get() == this) shown = null
    super.onDestroy()
  }

  override fun invokeDefaultOnBackPressed() {
    moveTaskToBack(true)
  }

  override fun getMainComponentName(): String = "call"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  companion object {
    private var shown: WeakReference<CallActivity>? = null

    val current: CallActivity?
      get() = shown?.get()
  }
}
