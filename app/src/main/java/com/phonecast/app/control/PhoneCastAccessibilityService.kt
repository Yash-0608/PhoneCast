package com.phonecast.app.control

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.graphics.PointF
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.util.ArrayDeque
import kotlin.math.hypot

/**
 * Applies remote touch gestures only while PhoneCast's authorized session is
 * active. Accessibility must be enabled explicitly by the phone owner in
 * Android Settings; the application cannot enable this service itself.
 *
 * Gestures are queued and dispatched one at a time. Calling dispatchGesture
 * while another gesture is in progress cancels the current Android gesture,
 * so issuing one new Android gesture for every incoming pointer-move event
 * is deliberately avoided.
 */
class PhoneCastAccessibilityService : AccessibilityService() {

    companion object {

        private const val TAG = "PhoneCastAccessibility"

        @Volatile
        private var instance: PhoneCastAccessibilityService? = null

        /*
         * Compatibility state for INPUT_TOUCH down/move/up messages.
         * The path is collected first, then dispatched as one complete
         * Android gesture on UP. This avoids competing dispatchGesture calls.
         */
        private var activePointerId: Int? = null
        private var activePoints: MutableList<PointF> = mutableListOf()
        private var activeStartedAt = 0L

        @Synchronized
        fun dispatchTouch(
            action: String,
            pointerId: Int,
            x: Float,
            y: Float
        ): Boolean {

            val service = instance ?: return false
            val normalizedAction = action.lowercase()

            /*
             * CANCEL must work even if the caller has no final coordinates.
             */
            if (normalizedAction == "cancel") {
                if (activePointerId == null || activePointerId == pointerId) {
                    activePointerId = null
                    activePoints.clear()
                    activeStartedAt = 0L
                }
                return true
            }

            if (
                !x.isFinite() ||
                !y.isFinite() ||
                x < 0f ||
                y < 0f
            ) {
                return false
            }

            when (normalizedAction) {

                "tap" -> {
                    return service.dispatchTap(x, y)
                }

                "down" -> {
                    if (activePointerId != null) {
                        return false
                    }

                    activePointerId = pointerId
                    activePoints = mutableListOf(PointF(x, y))
                    activeStartedAt = SystemClock.uptimeMillis()
                    return true
                }

                "move" -> {
                    if (activePointerId != pointerId) {
                        return false
                    }

                    appendPoint(x, y)
                    return true
                }

                "up" -> {
                    if (activePointerId != pointerId) {
                        return false
                    }

                    appendPoint(x, y)

                    val points = activePoints.toList()
                    val duration = (
                        SystemClock.uptimeMillis() - activeStartedAt
                    ).coerceIn(1L, 2000L)

                    activePointerId = null
                    activePoints.clear()
                    activeStartedAt = 0L

                    if (points.isEmpty()) {
                        return false
                    }

                    val path = Path().apply {
                        moveTo(points.first().x, points.first().y)
                        points.drop(1).forEach { point ->
                            lineTo(point.x, point.y)
                        }
                    }

                    val stroke = GestureDescription.StrokeDescription(
                        path,
                        0L,
                        duration
                    )

                    return service.enqueueGesture(
                        GestureDescription.Builder()
                            .addStroke(stroke)
                            .build()
                    )
                }

                else -> return false
            }
        }

        private fun appendPoint(x: Float, y: Float) {
            val last = activePoints.lastOrNull()

            if (last == null) {
                activePoints.add(PointF(x, y))
                return
            }

            if (hypot((x - last.x).toDouble(), (y - last.y).toDouble()) < 1.0) {
                return
            }

            /*
             * Bound memory use if a sender emits an unusually large number
             * of MOVE events for one drag. Preserve the latest endpoint.
             */
            if (activePoints.size >= 180) {
                activePoints.removeAt(activePoints.lastIndex)
            }

            activePoints.add(PointF(x, y))
        }

        fun isEnabled(): Boolean = instance != null

        fun dispatchTap(
            x: Float,
            y: Float
        ): Boolean {

            val service = instance ?: return false

            if (!x.isFinite() || !y.isFinite() || x < 0f || y < 0f) {
                return false
            }

            val path = Path().apply {
                moveTo(x, y)
            }

            val gesture = GestureDescription.Builder()
                .addStroke(
                    GestureDescription.StrokeDescription(
                        path,
                        0L,
                        70L
                    )
                )
                .build()

            return service.enqueueGesture(gesture)
        }

        /**
         * Submit one complete swipe/drag. The gesture will run once earlier
         * queued gestures have completed instead of cancelling them.
         */
        fun tapOrDrag(
            startX: Float,
            startY: Float,
            endX: Float,
            endY: Float,
            durationMs: Long
        ): Boolean {

            val service = instance ?: return false

            if (
                !startX.isFinite() ||
                !startY.isFinite() ||
                !endX.isFinite() ||
                !endY.isFinite() ||
                startX < 0f ||
                startY < 0f ||
                endX < 0f ||
                endY < 0f
            ) {
                return false
            }

            val path = Path().apply {
                moveTo(startX, startY)
                if (hypot((endX - startX).toDouble(), (endY - startY).toDouble()) >= 1.0) {
                    lineTo(endX, endY)
                }
            }

            val gesture = GestureDescription.Builder()
                .addStroke(
                    GestureDescription.StrokeDescription(
                        path,
                        0L,
                        durationMs.coerceIn(1L, 2000L)
                    )
                )
                .build()

            return service.enqueueGesture(gesture)
        }

        fun setFocusedText(text: String): Boolean {
            val service = instance ?: return false
            val node = service.rootInActiveWindow
                ?.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
                ?: return false

            val current = node.text?.toString().orEmpty()
            val arguments = Bundle().apply {
                putCharSequence(
                    AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                    current + text
                )
            }

            return node.performAction(
                AccessibilityNodeInfo.ACTION_SET_TEXT,
                arguments
            )
        }

        fun performKey(key: String): Boolean {
            val service = instance ?: return false

            return when (key.uppercase()) {
                "BACK" -> service.enqueueGlobalAction(GLOBAL_ACTION_BACK)
                "HOME" -> service.enqueueGlobalAction(GLOBAL_ACTION_HOME)
                "RECENTS" -> service.enqueueGlobalAction(GLOBAL_ACTION_RECENTS)
                "NOTIFICATIONS" -> service.enqueueGlobalAction(GLOBAL_ACTION_NOTIFICATIONS)
                "ENTER" -> setFocusedText("\n")
                "BACKSPACE" -> deleteFocusedCharacter()
                else -> false
            }
        }

        private fun deleteFocusedCharacter(): Boolean {
            val service = instance ?: return false
            val node = service.rootInActiveWindow
                ?.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
                ?: return false
            val current = node.text?.toString() ?: return false

            if (current.isEmpty()) {
                return true
            }

            val arguments = Bundle().apply {
                putCharSequence(
                    AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                    current.dropLast(1)
                )
            }

            return node.performAction(
                AccessibilityNodeInfo.ACTION_SET_TEXT,
                arguments
            )
        }
    }

    private val mainHandler =
        Handler(Looper.getMainLooper())

    private val pendingGestures =
        ArrayDeque<GestureDescription>()

    private var gestureInProgress = false

    /**
     * Queue dispatch on the main thread. Returning true means the request
     * was accepted into PhoneCast's local queue, not that Android has already
     * completed the gesture.
     */
    private fun enqueueGesture(
        gesture: GestureDescription
    ): Boolean {

        mainHandler.post {
            if (instance !== this) {
                return@post
            }

            pendingGestures.addLast(gesture)
            dispatchNextGesture()
        }

        return true
    }

    private fun enqueueGlobalAction(
        action: Int
    ): Boolean {

        mainHandler.post {
            if (instance !== this) {
                return@post
            }

            val success = performGlobalAction(action)
            if (!success) {
                Log.w(TAG, "Android rejected global action: $action")
            }
        }

        return true
    }

    private fun dispatchNextGesture() {

        if (
            instance !== this ||
            gestureInProgress ||
            pendingGestures.isEmpty()
        ) {
            return
        }

        val gesture =
            pendingGestures.removeFirst()

        gestureInProgress = true

        val accepted = try {
            dispatchGesture(
                gesture,
                object : GestureResultCallback() {

                    override fun onCompleted(
                        gestureDescription: GestureDescription
                    ) {
                        finishGesture()
                    }

                    override fun onCancelled(
                        gestureDescription: GestureDescription
                    ) {
                        Log.w(TAG, "Android cancelled a queued remote gesture.")
                        finishGesture()
                    }
                },
                mainHandler
            )
        } catch (error: Exception) {
            Log.e(TAG, "Unable to dispatch remote gesture.", error)
            false
        }

        if (!accepted) {
            Log.w(TAG, "Android did not accept a remote gesture.")
            gestureInProgress = false

            /*
             * Avoid a tight retry loop if the device repeatedly refuses
             * gestures. Continue with other queued actions after a brief gap.
             */
            mainHandler.postDelayed(
                { dispatchNextGesture() },
                30L
            )
        }
    }

    private fun finishGesture() {
        gestureInProgress = false
        dispatchNextGesture()
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this

        Log.i(TAG, "PhoneCast Accessibility Service connected.")

        mainHandler.post {
            dispatchNextGesture()
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit

    override fun onInterrupt() {
        synchronized(this) {
            activePointerId = null
            activePoints.clear()
            activeStartedAt = 0L
        }

        mainHandler.post {
            pendingGestures.clear()
            gestureInProgress = false
        }

        Log.w(TAG, "PhoneCast Accessibility Service interrupted.")
    }

    override fun onKeyEvent(event: KeyEvent?): Boolean = false

    override fun onUnbind(intent: android.content.Intent?): Boolean {
        if (instance === this) {
            instance = null
        }

        synchronized(this) {
            activePointerId = null
            activePoints.clear()
            activeStartedAt = 0L
        }

        mainHandler.post {
            pendingGestures.clear()
            gestureInProgress = false
        }

        Log.w(TAG, "PhoneCast Accessibility Service unbound.")
        return super.onUnbind(intent)
    }

    override fun onDestroy() {
        if (instance === this) {
            instance = null
        }

        synchronized(this) {
            activePointerId = null
            activePoints.clear()
            activeStartedAt = 0L
        }

        mainHandler.post {
            pendingGestures.clear()
            gestureInProgress = false
        }

        super.onDestroy()
    }
}
