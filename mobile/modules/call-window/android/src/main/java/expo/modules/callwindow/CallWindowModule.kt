package expo.modules.callwindow

import android.app.KeyguardManager
import android.content.Intent
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CallWindowModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CallWindow")

    AsyncFunction("close") {
      CallActivity.current?.finish()
    }.runOnQueue(Queues.MAIN)

    // A locked phone shows the chats only once it is unlocked; turning that down stays on the call.
    AsyncFunction("openChats") {
      val window = CallActivity.current
      val keyguard = window?.getSystemService(KeyguardManager::class.java)
      if (window != null && keyguard != null) {
        if (keyguard.isKeyguardLocked) {
          keyguard.requestDismissKeyguard(
            window,
            object : KeyguardManager.KeyguardDismissCallback() {
              override fun onDismissSucceeded() = showChats(window)
            },
          )
        } else {
          showChats(window)
        }
      }
    }.runOnQueue(Queues.MAIN)
  }

  private fun showChats(window: CallActivity) {
    window.packageManager.getLaunchIntentForPackage(window.packageName)?.let { chats ->
      window.startActivity(chats.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP))
    }
    window.moveTaskToBack(true)
  }
}
