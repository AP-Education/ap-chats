package expo.modules.callreadiness

import android.app.ActivityManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// expo-callkit-telecom names its ringing channel after this, followed by the ringtone it plays.
private const val INCOMING_CALLS_CHANNEL_PREFIX = "expo_callkit_telecom_incoming"

class CallReadinessModule : Module() {
  private val context
    get() = requireNotNull(appContext.reactContext)

  private val notifications
    get() = context.getSystemService(NotificationManager::class.java)

  override fun definition() = ModuleDefinition {
    Name("CallReadiness")

    Function("notificationsAllowed") { notifications.areNotificationsEnabled() }

    // Turned down to silent, a call only shows up in the shade: no ring, no screen.
    Function("callsRingAloud") {
      val channel = incomingCallsChannel()
      channel == null || channel.importance >= NotificationManager.IMPORTANCE_HIGH
    }

    // Without it Android 14+ shows an incoming call as a plain notification: it buzzes, the screen stays dark.
    Function("canRingFullScreen") {
      Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE ||
        notifications.canUseFullScreenIntent()
    }

    Function("runsUnrestricted") {
      context.getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(context.packageName)
    }

    // A restricted app gets no push at all while it is in the background.
    Function("mayRunInBackground") {
      Build.VERSION.SDK_INT < Build.VERSION_CODES.P ||
        !context.getSystemService(ActivityManager::class.java).isBackgroundRestricted
    }

    Function("openNotificationSettings") { open(appNotificationSettings()) }

    // Before the first call there is no channel yet, and the app's own notifications page stands in.
    Function("openCallChannelSettings") {
      val channel = incomingCallsChannel()
      open(
        if (channel == null) appNotificationSettings()
        else appNotificationSettings(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
          .putExtra(Settings.EXTRA_CHANNEL_ID, channel.id),
      )
    }

    Function("openFullScreenSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        open(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, packageUri()))
      }
    }

    Function("askToRunUnrestricted") {
      open(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, packageUri()))
    }

    // Background restriction lives on the app's own page, under its battery use.
    Function("openAppSettings") {
      open(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, packageUri()))
    }
  }

  private fun incomingCallsChannel(): NotificationChannel? =
    notifications.notificationChannels.firstOrNull { it.id.startsWith(INCOMING_CALLS_CHANNEL_PREFIX) }

  private fun appNotificationSettings(action: String = Settings.ACTION_APP_NOTIFICATION_SETTINGS) =
    Intent(action).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)

  private fun packageUri() = Uri.parse("package:${context.packageName}")

  private fun open(intent: Intent) {
    val activity = appContext.currentActivity
    if (activity != null) activity.startActivity(intent)
    else context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
  }
}
