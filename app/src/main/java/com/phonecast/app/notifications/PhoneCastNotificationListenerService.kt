package com.phonecast.app.notifications

import android.app.Notification
import android.app.PendingIntent
import android.app.RemoteInput
import android.content.Intent
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.phonecast.app.MainActivity
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

/**
 * Mirrors notification metadata only after the user explicitly enables
 * PhoneCast in Android's Notification Access settings. PhoneCast forwards
 * these events to the laptop only during an authenticated active session.
 *
 * Replies are sent only through a RemoteInput action supplied by the
 * originating notification. This does not attempt to bypass app boundaries
 * or automate private app UIs.
 */
class PhoneCastNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "PhoneCastNotifications"

        @Volatile
        private var currentService: PhoneCastNotificationListenerService? = null

        @JvmStatic
        fun publishCurrentSnapshot() {
            currentService?.publishSnapshot()
        }

        @JvmStatic
        fun replyToNotification(
            notificationKey: String,
            replyText: String
        ): Boolean {
            if (notificationKey.isBlank() || replyText.isBlank()) {
                return false
            }
            return currentService?.sendReply(notificationKey, replyText) ?: false
        }

        @JvmStatic
        fun dismissNotification(notificationKey: String): Boolean {
            if (notificationKey.isBlank()) {
                return false
            }
            val service = currentService ?: return false
            return service.dismissByKey(notificationKey)
        }
    }

    private val notificationCache =
        ConcurrentHashMap<String, StatusBarNotification>()

    override fun onListenerConnected() {
        super.onListenerConnected()
        currentService = this

        Log.i(TAG, "Notification access connected.")

        try {
            activeNotifications
                ?.filterNot { shouldIgnore(it) }
                ?.forEach { notificationCache[it.key] = it }

            publishSnapshot()
        } catch (error: Exception) {
            Log.e(TAG, "Could not read active notifications.", error)
        }
    }

    override fun onListenerDisconnected() {
        if (currentService === this) {
            currentService = null
        }

        notificationCache.clear()
        Log.w(TAG, "Notification access disconnected.")
        super.onListenerDisconnected()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (shouldIgnore(sbn)) {
            return
        }

        notificationCache[sbn.key] = sbn

        try {
            val payload = notificationToJson(sbn)
                .put("type", "PHONE_NOTIFICATION_POSTED")

            MainActivity.publishNotificationEvent(payload)
        } catch (error: Exception) {
            Log.e(TAG, "Unable to publish posted notification.", error)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        notificationCache.remove(sbn.key)

        try {
            MainActivity.publishNotificationEvent(
                JSONObject()
                    .put("type", "PHONE_NOTIFICATION_REMOVED")
                    .put("key", sbn.key)
                    .put("packageName", sbn.packageName)
            )
        } catch (error: Exception) {
            Log.e(TAG, "Unable to publish notification removal.", error)
        }
    }

    private fun shouldIgnore(sbn: StatusBarNotification): Boolean {
        if (sbn.packageName == packageName) {
            return true
        }

        return (sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY) != 0
    }

    private fun publishSnapshot() {
        if (currentService !== this) {
            return
        }

        try {
            val snapshot = JSONArray()
            val active = activeNotifications ?: emptyArray()

            active
                .filterNot { shouldIgnore(it) }
                .forEach { sbn ->
                    notificationCache[sbn.key] = sbn
                    snapshot.put(notificationToJson(sbn))
                }

            val payload = JSONObject()
                .put("type", "PHONE_NOTIFICATIONS_SNAPSHOT")
                .put("notifications", snapshot)

            MainActivity.publishNotificationEvent(payload)

            Log.d(TAG, "Published notification snapshot (" + snapshot.length() + " items).")
        } catch (error: Exception) {
            Log.e(TAG, "Could not publish notification snapshot.", error)
        }
    }

    private fun notificationToJson(
        sbn: StatusBarNotification
    ): JSONObject {
        val notification = sbn.notification
        val extras = notification.extras ?: Bundle()

        val title = (
            extras.getCharSequence(Notification.EXTRA_TITLE)
                ?: extras.getCharSequence(Notification.EXTRA_TITLE_BIG)
                ?: ""
            ).toString().take(300)

        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
        val normalText = extras.getCharSequence(Notification.EXTRA_TEXT)
        val lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
            ?.joinToString("\n") { it.toString() }

        val body = (
            bigText
                ?: normalText
                ?: lines
                ?: extras.getCharSequence(Notification.EXTRA_SUB_TEXT)
                ?: ""
            ).toString().take(2000)

        val appLabel = try {
            val appInfo = packageManager.getApplicationInfo(sbn.packageName, 0)
            packageManager.getApplicationLabel(appInfo).toString().take(100)
        } catch (_: Exception) {
            sbn.packageName
        }

        val replyAction = notification.actions
            ?.firstOrNull { action ->
                !action.remoteInputs.isNullOrEmpty() &&
                    action.actionIntent != null
            }

        return JSONObject()
            .put("key", sbn.key)
            .put("packageName", sbn.packageName)
            .put("appName", appLabel)
            .put("title", title)
            .put("text", body)
            .put("postTime", sbn.postTime)
            .put("hasReplyAction", replyAction != null)
            .put("replyActionTitle", replyAction?.title?.toString().orEmpty())
            .put("isOngoing", notification.flags and Notification.FLAG_ONGOING_EVENT != 0)
    }

    private fun sendReply(
        notificationKey: String,
        replyText: String
    ): Boolean {
        val sbn = notificationCache[notificationKey] ?: run {
            Log.w(TAG, "Reply ignored because the notification is no longer active.")
            return false
        }

        val actions = sbn.notification.actions ?: return false
        val action = actions.firstOrNull { candidate ->
            !candidate.remoteInputs.isNullOrEmpty() &&
                candidate.actionIntent != null
        } ?: return false

        val remoteInputs = action.remoteInputs ?: return false
        if (remoteInputs.isEmpty()) {
            return false
        }

        return try {
            val fillInIntent = Intent()
            val results = Bundle()

            remoteInputs.forEach { remoteInput ->
                if (remoteInput.allowFreeFormInput) {
                    results.putCharSequence(remoteInput.resultKey, replyText)
                }
            }

            if (results.isEmpty()) {
                Log.w(TAG, "Reply action has no free-form text input.")
                return false
            }

            RemoteInput.addResultsToIntent(
                remoteInputs,
                fillInIntent,
                results
            )

            action.actionIntent.send(
                this,
                0,
                fillInIntent
            )

            Log.i(TAG, "Reply sent through notification RemoteInput.")
            true
        } catch (error: PendingIntent.CanceledException) {
            Log.w(TAG, "Notification reply action is no longer available.", error)
            false
        } catch (error: Exception) {
            Log.e(TAG, "Unable to send notification reply.", error)
            false
        }
    }

    private fun dismissByKey(
        notificationKey: String
    ): Boolean {
        val sbn = notificationCache[notificationKey] ?: return false

        return try {
            cancelNotification(sbn.key)
            notificationCache.remove(sbn.key)
            true
        } catch (error: Exception) {
            Log.e(TAG, "Unable to dismiss notification.", error)
            false
        }
    }
}
