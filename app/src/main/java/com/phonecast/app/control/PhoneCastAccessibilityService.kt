package com.phonecast.app.control

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.os.Bundle
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class PhoneCastAccessibilityService : AccessibilityService() {

    companion object {
        @Volatile
        private var instance: PhoneCastAccessibilityService? = null

        private var activeStroke: GestureDescription.StrokeDescription? = null
        private var activePointerId: Int? = null
        private var lastX = 0f
        private var lastY = 0f

        @Synchronized
        fun dispatchTouch(
            action: String,
            pointerId: Int,
            x: Float,
            y: Float
        ): Boolean {
            val service = instance ?: return false
            if (x < 0f || y < 0f) return false

            return when (action.lowercase()) {
                "down" -> {
                    if (activeStroke != null) return false
                    val path = Path().apply { moveTo(x, y) }
                    val stroke = GestureDescription.StrokeDescription(
                        path,
                        0L,
                        10_000L,
                        true
                    )
                    activeStroke = stroke
                    activePointerId = pointerId
                    lastX = x
                    lastY = y
                    val accepted = service.dispatchGesture(
                        GestureDescription.Builder()
                            .addStroke(stroke)
                            .build(),
                        null,
                        null
                    )
                    if (!accepted) {
                        activeStroke = null
                        activePointerId = null
                    }
                    accepted
                }

                "move" -> {
                    if (activeStroke == null || activePointerId != pointerId) {
                        return false
                    }
                    val path = Path().apply {
                        moveTo(lastX, lastY)
                        lineTo(x, y)
                    }
                    val stroke = activeStroke!!.continueStroke(
                        path,
                        0L,
                        16L,
                        true
                    )
                    activeStroke = stroke
                    lastX = x
                    lastY = y
                    val accepted = service.dispatchGesture(
                        GestureDescription.Builder()
                            .addStroke(stroke)
                            .build(),
                        null,
                        null
                    )
                    if (!accepted) {
                        activeStroke = null
                        activePointerId = null
                    }
                    accepted
                }

                "up", "cancel" -> {
                    if (activeStroke == null || activePointerId != pointerId) {
                        return false
                    }
                    val path = Path().apply {
                        moveTo(lastX, lastY)
                        lineTo(x, y)
                    }
                    val stroke = activeStroke!!.continueStroke(
                        path,
                        0L,
                        1L,
                        false
                    )
                    activeStroke = null
                    activePointerId = null
                    service.dispatchGesture(
                        GestureDescription.Builder()
                            .addStroke(stroke)
                            .build(),
                        null,
                        null
                    )
                }

                else -> false
            }
        }

        @Synchronized
        fun cancelTouch(): Boolean {
            val service = instance ?: return false
            val stroke = activeStroke ?: return true
            val path = Path().apply {
                moveTo(lastX, lastY)
            }
            val endedStroke = stroke.continueStroke(
                path,
                0L,
                1L,
                false
            )
            activeStroke = null
            activePointerId = null
            return service.dispatchGesture(
                GestureDescription.Builder()
                    .addStroke(endedStroke)
                    .build(),
                null,
                null
            )
        }

        fun isEnabled(): Boolean = instance != null

        fun tapOrDrag(
            startX: Float,
            startY: Float,
            endX: Float,
            endY: Float,
            durationMs: Long
        ): Boolean {
            val service = instance ?: return false
            val path = Path().apply {
                moveTo(startX, startY)
                lineTo(endX, endY)
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
            return service.dispatchGesture(gesture, null, null)
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
            return when (key) {
                "BACK" -> service.performGlobalAction(GLOBAL_ACTION_BACK)
                "HOME" -> service.performGlobalAction(GLOBAL_ACTION_HOME)
                "RECENTS" -> service.performGlobalAction(GLOBAL_ACTION_RECENTS)
                "NOTIFICATIONS" -> service.performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS)
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
            if (current.isEmpty()) return true
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

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit

    override fun onInterrupt() = Unit

    override fun onKeyEvent(event: KeyEvent?): Boolean = false

    override fun onDestroy() {
        activeStroke = null
        activePointerId = null
        if (instance === this) {
            instance = null
        }
        super.onDestroy()
    }
}
