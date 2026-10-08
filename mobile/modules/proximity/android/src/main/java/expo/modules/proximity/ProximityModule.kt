package expo.modules.proximity

import android.content.Context
import android.os.PowerManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ProximityModule : Module() {
  private var wakeLock: PowerManager.WakeLock? = null

  override fun definition() = ModuleDefinition {
    Name("Proximity")

    Function("setMonitoring") { enabled: Boolean ->
      if (enabled) acquire() else release()
    }

    OnDestroy { release() }
  }

  private fun acquire() {
    if (wakeLock?.isHeld == true) return

    val power = appContext.reactContext?.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
    if (!power.isWakeLockLevelSupported(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK)) return

    wakeLock = power.newWakeLock(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK, "apchats:call-proximity").apply {
      setReferenceCounted(false)
      acquire()
    }
  }

  // Waits for the phone to leave the ear, so the screen doesn't flash on mid-gesture.
  private fun release() {
    wakeLock?.takeIf { it.isHeld }?.release(PowerManager.RELEASE_FLAG_WAIT_FOR_NO_PROXIMITY)
    wakeLock = null
  }
}
