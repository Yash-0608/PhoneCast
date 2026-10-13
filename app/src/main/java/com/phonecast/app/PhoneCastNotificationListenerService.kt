package com.phonecast.app

import android.app.Notification
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import android.app.RemoteInput
import org.json.JSONArray
import org.json.JSONObject
import java.util.LinkedHashMap

/**
 * Mirrors notification content and supported inline-reply actions to an
 * already-authorized PhoneCast desktop session.
 *
 * This service does not read private application databases. Messages from
 * apps such as WhatsApp and Instagram are available only to the extent that
 * those apps expose content/actions through Android notifications.
 *
 * Notification access must be enabled manually by the phone owner in system
 * settings. PhoneCast cannot grant this access itself.
 */
class PhoneCastNotificationListenerService : NotificationListenerService() {

    companion object {

        private const val TAG = "PhoneCastNotifications"
        private const val MAX_RECENT_NOTIFICATIONS = 100

        @Volatile
        private var currentService: PhoneCastNotificationListenerService? = null

        /*
         * Preserve recent notification previews for the lifetime of this
         * service connection. Only notification data is retained here;
         * PendingIntent objects stay in the active StatusBarNotification map.
         */
        private val recentNotifications =
            LinkedHashMap<String, JSONObject>()

        private val activeNotificationsByKey =
            LinkedHashMap<String, StatusBarNotification>()

        fun isAccessGranted(context: Context): Boolean {
            val enabledListeners =
                Settings.Secure.getString(
                    context.contentResolver,
                    "enabled_notification_listeners"
                ).orEmpty()

            return enabledListeners
                .split(':')
                .mapNotNull(ComponentName::unflattenFromString)
                .any { component ->
                    component.packageName == context.packageName &&
                        component.className ==
                        PhoneCastNotificationListenerService::class.java.name
                }
        }

        /**
         * Returns null when Android has not connected the listener service.
         */
        fun snapshot(): JSONArray? {
            val service = currentService ?: return null
            return service.createSnapshot()
        }

        /**
         * Sends a reply using a RemoteInput action supplied by the original
         * application. Returns false when the notification is stale or does
         * not expose an inline reply action.
         */
        fun reply(
            notificationKey: String,
            actionIndex: Int,
            replyText: String
        ): Boolean {
            val service = currentService ?: return false
            return service.sendReply(
                notificationKey,
                actionIndex,
                replyText
            )
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        currentService = this

        Log.i(TAG, "Android notification listener connected.")

        try {
            activeNotifications.orEmpty().forEach { sbn ->
                updateNotificationRecord(sbn, notifyDesktop = false)
            }
        } catch (error: Exception) {
            Log.e(TAG, "Unable to read active notifications.", error)
        }
    }

    override fun onListenerDisconnected() {
        if (currentService === this) {
            currentService = null
        }

        synchronized(recentNotifications) {
            activeNotificationsByKey.clear()
        }

        Log.w(TAG, "Android notification listener disconnected.")
        super.onListenerDisconnected()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        updateNotificationRecord(sbn, notifyDesktop = true)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        val record = synchronized(recentNotifications) {
            activeNotificationsByKey.remove(sbn.key)
            recentNotifications[sbn.key]?.let { existing ->
                JSONObject(existing.toString()).apply {
                    put("active", false)
                    put("canReply", false)
                    put("replyActionIndex", -1)
                }.also {
                    recentNotifications[sbn.key] = it
                }
            }
        } ?: return

        MainActivity.sendNotificationEventToLaptop(
            JSONObject().apply {
                put("type", "PHONE_NOTIFICATION")
                put("notification", record)
            }
        )
    }

    private fun updateNotificationRecord(
        sbn: StatusBarNotification,
        notifyDesktop: Boolean
    ) {
        try {
            if (sbn.packageName == packageName) {
                return
            }

            val record = createNotificationRecord(sbn)

            synchronized(recentNotifications) {
                activeNotificationsByKey[sbn.key] = sbn
                recentNotifications.remove(sbn.key)
                recentNotifications[sbn.key] = record

                while (recentNotifications.size > MAX_RECENT_NOTIFICATIONS) {
                    val oldestKey = recentNotifications.entries.firstOrNull()?.key
                        ?: break
                    recentNotifications.remove(oldestKey)
                    activeNotificationsByKey.remove(oldestKey)
                }
            }

            if (notifyDesktop) {
                MainActivity.sendNotificationEventToLaptop(
                    JSONObject().apply {
                        put("type", "PHONE_NOTIFICATION")
                        put("notification", record)
                    }
                )
            }
        } catch (error: Exception) {
            Log.e(TAG, "Could not process a phone notification.", error)
        }
    }

    private fun createNotificationRecord(
        sbn: StatusBarNotification
    ): JSONObject {
        val notification = sbn.notification
        val extras = notification.extras

        val title =
            extras?.getCharSequence(Notification.EXTRA_TITLE)
                ?.toString()
                .orEmpty()

        val text =
            extras?.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
                ?.takeIf { it.isNotBlank() }
                ?: extras?.getCharSequence(Notification.EXTRA_TEXT)?.toString()
                    .orEmpty()

        val appLabel = try {
            packageManager.getApplicationLabel(
                packageManager.getApplicationInfo(sbn.packageName, 0)
            ).toString()
        } catch (_: Exception) {
            sbn.packageName
        }

        val actions =
            notification.actions.orEmpty()

        val replyActionIndex =
            actions.indexOfFirst { action ->
                action.remoteInputs?.isNotEmpty() == true
            }

        return JSONObject().apply {
            put("key", sbn.key)
            put("packageName", sbn.packageName)
            put("appName", appLabel)
            put("title", title)
            put("text", text)
            put("postedAt", sbn.postTime)
            put("category", notification.category.orEmpty())
            put("active", true)
            put("canReply", replyActionIndex >= 0)
            put("replyActionIndex", replyActionIndex)
        }
    }

    private fun createSnapshot(): JSONArray {
        /*
         * Refresh from Android's current list first so permission enablement
         * or service reconnection does not rely only on future notifications.
         */
        try {
            activeNotifications.orEmpty().forEach { sbn ->
                updateNotificationRecord(sbn, notifyDesktop = false)
            }
        } catch (error: Exception) {
            Log.w(TAG, "Could not refresh active notifications.", error)
        }

        return synchronized(recentNotifications) {
            JSONArray().apply {
                recentNotifications.values.forEach { record ->
                    put(JSONObject(record.toString()))
                }
            }
        }
    }

    private fun sendReply(
        notificationKey: String,
        actionIndex: Int,
        replyText: String
    ): Boolean {
        if (replyText.isBlank() || replyText.length > 4000) {
            return false
        }

        val sbn = synchronized(recentNotifications) {
            activeNotificationsByKey[notificationKey]
        } ?: return false

        val action = sbn.notification.actions
            ?.getOrNull(actionIndex)
            ?: return false

        val remoteInputs =
            action.remoteInputs?.takeIf { it.isNotEmpty() }
                ?: return false

        return try {
            val results = Bundle()
            var populated = false

            remoteInputs.forEach { remoteInput ->
                if (remoteInput.allowFreeFormInput) {
                    results.putCharSequence(
                        remoteInput.resultKey,
                        replyText
                    )
                    populated = true
                }
            }

            if (!populated) {
                return false
            }

            val fillInIntent = Intent()
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

            Log.i(
                TAG,
                "Inline reply sent to notification action from ${sbn.packageName}."
            )

            true
        } catch (error: PendingIntent.CanceledException) {
            Log.w(TAG, "The notification reply action has expired.", error)
            false
        } catch (error: Exception) {
            Log.e(TAG, "Unable to send notification reply.", error)
            false
        }
    }
}
