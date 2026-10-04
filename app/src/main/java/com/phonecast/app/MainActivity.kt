package com.phonecast.app

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.provider.Settings
import android.graphics.Color as AndroidColor
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import android.util.DisplayMetrics
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.phonecast.app.capture.ScreenCaptureService
import com.phonecast.app.control.PhoneCastAccessibilityService
import com.phonecast.app.network.ConnectionRequest
import com.phonecast.app.network.PhoneCastDiscovery
import com.phonecast.app.network.PhoneCastServer
import com.phonecast.app.ui.PhoneCastApp
import org.json.JSONObject
import java.io.PrintWriter
import java.util.concurrent.Executors
import java.net.Socket
import java.util.concurrent.atomic.AtomicBoolean


class MainActivity : FragmentActivity() {

    companion object {
        private const val TAG = "PhoneCastMain"

        private const val DEFAULT_CAPTURE_WIDTH = 1080
        private const val DEFAULT_CAPTURE_HEIGHT = 2400
        private const val DEFAULT_CAPTURE_DENSITY = 420
    }

    private lateinit var database: PhoneCastDatabase
    private lateinit var phoneCastServer: PhoneCastServer
    private lateinit var phoneCastDiscovery: PhoneCastDiscovery

    // =========================================================
    // APPLICATION STATE
    // =========================================================

    private var appState by mutableStateOf<PhoneCastAppState>(
        PhoneCastAppState.Starting
    )

    private var onboardingPage by mutableStateOf(
        PhoneCastOnboardingPage.Welcome
    )

    private var pendingName by mutableStateOf("")

    private var userName by mutableStateOf<String?>(null)

    private var pendingRequest: ConnectionRequest? by mutableStateOf(null)

    private var pendingWriter: PrintWriter? by mutableStateOf(null)

    private var pendingSocket: Socket? by mutableStateOf(null)

    private var connectionHistory by mutableStateOf(
        emptyList<PhoneCastDatabase.ConnectionHistory>()
    )

    // =========================================================
    // ACTIVE CONNECTION SESSION
    // =========================================================

    private var activeRequestId: String? = null

    private var activeLaptopName: String? = null

    private var activeSocket: Socket? = null

    private var activeWriter: PrintWriter? = null

    private val controlWriteExecutor =
        Executors.newSingleThreadExecutor { runnable ->
            Thread(
                runnable,
                "PhoneCast-ControlWriter"
            ).apply {
                isDaemon = true
            }
        }

    private var authenticationInProgress = false

    private var authenticated = false

    private val activityDestroyed = AtomicBoolean(false)

    // =========================================================
    // SCREEN CAPTURE STATE
    // =========================================================

    private var screenCaptureRequestInProgress = false

    private var screenCaptureActive = false

    private var videoServerPort = -1

    private var captureWidth = DEFAULT_CAPTURE_WIDTH

    private var captureHeight = DEFAULT_CAPTURE_HEIGHT

    private var captureDensity = DEFAULT_CAPTURE_DENSITY

    // =========================================================
    // MEDIA PROJECTION RESULT
    // =========================================================

    private val screenCaptureLauncher =
        registerForActivityResult(
            ActivityResultContracts.StartActivityForResult()
        ) { result ->

            handleScreenCaptureResult(
                result.resultCode,
                result.data
            )
        }

    // =========================================================
    // VIDEO SERVER BROADCAST RECEIVER
    // =========================================================

    private val videoServerReceiver =
        object : BroadcastReceiver() {

            override fun onReceive(
                context: Context?,
                intent: Intent?
            ) {

                if (intent == null) {
                    return
                }

                when (intent.action) {

                    ScreenCaptureService.ACTION_VIDEO_SERVER_READY -> {

                        val port =
                            intent.getIntExtra(
                                ScreenCaptureService.EXTRA_VIDEO_PORT,
                                -1
                            )

                        handleVideoServerReady(port)
                    }

                    ScreenCaptureService.ACTION_VIDEO_SERVER_STOPPED -> {

                        handleVideoServerStopped()
                    }
                }
            }
        }

    // =========================================================
    // ACTIVITY
    // =========================================================

    override fun onCreate(
        savedInstanceState: Bundle?
    ) {

        super.onCreate(savedInstanceState)

        configureSystemBars()

        database =
            PhoneCastDatabase(this)

        loadPersistedApplicationState()

        initializeNetworking()

        registerVideoServerReceiver()

        setContent {

            PhoneCastTheme {

                PhoneCastApp(

                    userName = userName,

                    onboardingPage =
                        onboardingPageToInt(),

                    pendingRequest =
                        pendingRequest,

                    connectionHistory =
                        connectionHistory,

                    onWelcomeContinue = {

                        moveToNamePage()
                    },

                    onNameEntered = { name ->

                        handleNameEntered(
                            name
                        )
                    },

                    onBackToWelcome = {

                        moveToWelcomePage()
                    },

                    onBackToName = {

                        moveToNamePage()
                    },

                    onSecureAccount = {

                        authenticateForAccount()
                    },

                    onAcceptRequest = { request ->

                        acceptConnection(
                            request
                        )
                    },

                    onRejectRequest = { request ->

                        rejectConnection(
                            request
                        )
                    },

                    onEnableRemoteControl = {

                        startActivity(
                            Intent(
                                Settings.ACTION_ACCESSIBILITY_SETTINGS
                            )
                        )
                    }
                )
            }
        }
    }

    // =========================================================
    // SYSTEM UI
    // =========================================================

    @Suppress("DEPRECATION")
    private fun configureSystemBars() {

        window.statusBarColor =
            AndroidColor.rgb(
                5,
                10,
                15
            )

        window.navigationBarColor =
            AndroidColor.rgb(
                5,
                10,
                15
            )
    }

    // =========================================================
    // PERSISTED APPLICATION STATE
    // =========================================================

    private fun loadPersistedApplicationState() {

        appState =
            PhoneCastAppState.Starting

        val savedName =
            database.getUserName()

        if (savedName.isNullOrBlank()) {

            userName = null

            pendingName = ""

            onboardingPage =
                PhoneCastOnboardingPage.Welcome

            connectionHistory =
                emptyList()

            appState =
                PhoneCastAppState.Onboarding

            Log.d(
                TAG,
                "No saved PhoneCast profile found."
            )

        } else {

            userName =
                savedName.trim()

            onboardingPage =
                PhoneCastOnboardingPage.Welcome

            loadConnectionHistory()

            appState =
                PhoneCastAppState.Ready(
                    userName = userName!!
                )

            Log.d(
                TAG,
                "Existing PhoneCast profile loaded: $userName"
            )
        }
    }

    // =========================================================
    // NETWORK INITIALIZATION
    // =========================================================

    private fun initializeNetworking() {

        phoneCastDiscovery =
            PhoneCastDiscovery(this)

        phoneCastServer =
            PhoneCastServer(

                onClientConnected = { socket ->

                    Log.d(
                        TAG,
                        "Laptop connected: " +
                                "${socket.inetAddress.hostAddress}"
                    )
                },

                onMessageReceived = {
                        message,
                        socket,
                        writer ->

                    handleIncomingMessage(
                        message = message,
                        socket = socket,
                        writer = writer
                    )
                }
            )

        phoneCastServer.start()

        waitForServerAndAdvertise()
    }

    private fun waitForServerAndAdvertise() {

        Thread {

            try {

                while (
                    !activityDestroyed.get() &&
                    phoneCastServer.port <= 0
                ) {

                    Thread.sleep(50L)
                }

                if (activityDestroyed.get()) {
                    return@Thread
                }

                val port =
                    phoneCastServer.port

                if (port <= 0) {

                    Log.e(
                        TAG,
                        "PhoneCast server failed to start."
                    )

                    return@Thread
                }

                runOnUiThread {

                    if (!activityDestroyed.get()) {

                        phoneCastDiscovery.register(
                            port
                        )

                        Log.d(
                            TAG,
                            "PhoneCast advertised on port $port"
                        )
                    }
                }

            } catch (
                interrupted: InterruptedException
            ) {

                Thread.currentThread().interrupt()

                Log.d(
                    TAG,
                    "Server advertisement wait interrupted."
                )

            } catch (
                exception: Exception
            ) {

                Log.e(
                    TAG,
                    "Failed to advertise PhoneCast.",
                    exception
                )
            }

        }.start()
    }

    // =========================================================
    // VIDEO SERVER RECEIVER
    // =========================================================

    private fun registerVideoServerReceiver() {

        val filter =
            IntentFilter().apply {

                addAction(
                    ScreenCaptureService.ACTION_VIDEO_SERVER_READY
                )

                addAction(
                    ScreenCaptureService.ACTION_VIDEO_SERVER_STOPPED
                )
            }

        ContextCompat.registerReceiver(
            this,
            videoServerReceiver,
            filter,
            ContextCompat.RECEIVER_NOT_EXPORTED
        )

        Log.d(
            TAG,
            "Video server receiver registered."
        )
    }

    // =========================================================
    // ONBOARDING
    // =========================================================

    private fun moveToWelcomePage() {

        if (userName != null) {
            return
        }

        onboardingPage =
            PhoneCastOnboardingPage.Welcome

        appState =
            PhoneCastAppState.Onboarding
    }

    private fun moveToNamePage() {

        if (userName != null) {
            return
        }

        onboardingPage =
            PhoneCastOnboardingPage.Name

        appState =
            PhoneCastAppState.Onboarding
    }

    private fun handleNameEntered(
        name: String
    ) {

        val cleanedName =
            name.trim()

        if (cleanedName.isEmpty()) {

            Toast.makeText(
                this,
                "Please enter your name.",
                Toast.LENGTH_SHORT
            ).show()

            return
        }

        if (cleanedName.length < 2) {

            Toast.makeText(
                this,
                "Please enter at least 2 characters.",
                Toast.LENGTH_SHORT
            ).show()

            return
        }

        if (cleanedName.length > 40) {

            Toast.makeText(
                this,
                "Name must be 40 characters or less.",
                Toast.LENGTH_SHORT
            ).show()

            return
        }

        pendingName =
            cleanedName

        onboardingPage =
            PhoneCastOnboardingPage.Security

        appState =
            PhoneCastAppState.SecuritySetup(
                userName = cleanedName
            )

        Log.d(
            TAG,
            "Name entered. Waiting for device authentication."
        )
    }

    // =========================================================
    // ACCOUNT AUTHENTICATION
    // =========================================================

    private fun authenticateForAccount() {

        if (pendingName.isBlank()) {

            Log.e(
                TAG,
                "Cannot authenticate without a pending name."
            )

            moveToNamePage()

            return
        }

        val biometricManager =
            BiometricManager.from(this)

        val authenticators =
            BiometricManager.Authenticators.BIOMETRIC_STRONG or
                    BiometricManager.Authenticators.DEVICE_CREDENTIAL

        val capability =
            biometricManager.canAuthenticate(
                authenticators
            )

        if (
            capability !=
            BiometricManager.BIOMETRIC_SUCCESS
        ) {

            val message =
                when (capability) {

                    BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE ->
                        "This device does not have biometric hardware."

                    BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE ->
                        "Biometric hardware is currently unavailable."

                    BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED ->
                        "Please configure fingerprint, face unlock, or a screen lock first."

                    else ->
                        "Android device security is unavailable."
                }

            Toast.makeText(
                this,
                message,
                Toast.LENGTH_LONG
            ).show()

            return
        }

        val executor =
            ContextCompat.getMainExecutor(this)

        val biometricPrompt =
            BiometricPrompt(
                this,
                executor,

                object :
                    BiometricPrompt.AuthenticationCallback() {

                    override fun onAuthenticationSucceeded(
                        result: BiometricPrompt.AuthenticationResult
                    ) {

                        super.onAuthenticationSucceeded(
                            result
                        )

                        completeAccountCreation()
                    }

                    override fun onAuthenticationError(
                        errorCode: Int,
                        errString: CharSequence
                    ) {

                        super.onAuthenticationError(
                            errorCode,
                            errString
                        )

                        Log.d(
                            TAG,
                            "Account authentication error: " +
                                    "$errorCode / $errString"
                        )

                        Toast.makeText(
                            this@MainActivity,
                            errString.toString(),
                            Toast.LENGTH_SHORT
                        ).show()
                    }

                    override fun onAuthenticationFailed() {

                        super.onAuthenticationFailed()

                        Log.d(
                            TAG,
                            "Account authentication attempt failed."
                        )
                    }
                }
            )

        val promptInfo =
            BiometricPrompt.PromptInfo.Builder()
                .setTitle(
                    "Secure Your PhoneCast Account"
                )
                .setSubtitle(
                    "Use your Android device security"
                )
                .setAllowedAuthenticators(
                    authenticators
                )
                .build()

        biometricPrompt.authenticate(
            promptInfo
        )
    }

    private fun completeAccountCreation() {

        val name =
            pendingName.trim()

        if (name.isEmpty()) {

            Log.e(
                TAG,
                "Account creation aborted: empty name."
            )

            moveToNamePage()

            return
        }

        database.saveUser(
            name
        )

        userName =
            database.getUserName()

        pendingName = ""

        loadConnectionHistory()

        if (userName.isNullOrBlank()) {

            appState =
                PhoneCastAppState.Error(
                    "The PhoneCast profile could not be loaded."
                )

            Toast.makeText(
                this,
                "Unable to create PhoneCast account.",
                Toast.LENGTH_LONG
            ).show()

            return
        }

        appState =
            PhoneCastAppState.Ready(
                userName = userName!!
            )

        Toast.makeText(
            this,
            "PhoneCast account created.",
            Toast.LENGTH_SHORT
        ).show()

        Log.d(
            TAG,
            "PhoneCast account successfully created."
        )
    }

    // =========================================================
    // CONNECTION HISTORY
    // =========================================================

    private fun loadConnectionHistory() {

        connectionHistory =
            database.getConnectionHistory()
    }

    // =========================================================
    // INCOMING NETWORK MESSAGE
    // =========================================================

    private fun handleIncomingMessage(
        message: String,
        socket: Socket,
        writer: PrintWriter
    ) {

        Log.d(
            TAG,
            "Incoming message: $message"
        )

        try {

            val json =
                JSONObject(message)

            val type =
                json.optString("type")

            when (type) {

                "CONNECTION_REQUEST" -> {

                    handleConnectionRequest(
                        json = json,
                        socket = socket,
                        writer = writer
                    )
                }

                "TERMINATE_SESSION" -> {

                    handleRemoteTermination(
                        json
                    )
                }

                "INPUT_TOUCH" -> {

                    handleRemoteTouch(
                        json
                    )
                }

                "INPUT_SCROLL" -> {

                    handleRemoteScroll(
                        json
                    )
                }

                "INPUT_TEXT" -> {

                    handleRemoteText(
                        json
                    )
                }

                "INPUT_KEY" -> {

                    handleRemoteKey(
                        json
                    )
                }

                else -> {

                    Log.w(
                        TAG,
                        "Unknown message type: $type"
                    )
                }
            }

        } catch (
            exception: Exception
        ) {

            Log.e(
                TAG,
                "Failed to process incoming message.",
                exception
            )
        }
    }

    private fun isAuthorizedInputRequest(
        json: JSONObject
    ): Boolean {

        val requestId =
            json.optString("requestId")

        return authenticated &&
                activeRequestId == requestId &&
                activeSocket?.isClosed == false
    }

    private fun handleRemoteTouch(
        json: JSONObject
    ) {

        if (!isAuthorizedInputRequest(json)) {
            return
        }

        val action =
            json.optString("action").lowercase()

        val accepted =
            if (action.isNotBlank()) {
                PhoneCastAccessibilityService.dispatchTouch(
                    action = action,
                    pointerId = json.optInt("pointerId", 0),
                    x = json.optDouble("x", -1.0).toFloat(),
                    y = json.optDouble("y", -1.0).toFloat()
                )
            } else {
                val startX =
                    json.optDouble("startX", -1.0).toFloat()
                val startY =
                    json.optDouble("startY", -1.0).toFloat()
                val endX =
                    json.optDouble("endX", -1.0).toFloat()
                val endY =
                    json.optDouble("endY", -1.0).toFloat()

                if (
                    startX < 0f ||
                    startY < 0f ||
                    endX < 0f ||
                    endY < 0f
                ) {
                    return
                }

                PhoneCastAccessibilityService.tapOrDrag(
                    startX = startX,
                    startY = startY,
                    endX = endX,
                    endY = endY,
                    durationMs = json.optLong("durationMs", 80L)
                )
            }

        if (!accepted) {
            notifyRemoteControlUnavailable()
        }
    }

    private fun handleRemoteText(
        json: JSONObject
    ) {

        if (!isAuthorizedInputRequest(json)) {
            return
        }

        val text =
            json.optString("text")

        if (text.isEmpty()) {
            return
        }

        if (!PhoneCastAccessibilityService.setFocusedText(text)) {
            notifyRemoteControlUnavailable()
        }
    }

    private fun handleRemoteScroll(
        json: JSONObject
    ) {

        if (!isAuthorizedInputRequest(json)) {
            return
        }

        val startX =
            json.optDouble("startX", -1.0).toFloat()

        val startY =
            json.optDouble("startY", -1.0).toFloat()

        val endX =
            json.optDouble("endX", -1.0).toFloat()

        val endY =
            json.optDouble("endY", -1.0).toFloat()

        if (
            startX < 0f ||
            startY < 0f ||
            endX < 0f ||
            endY < 0f
        ) {
            return
        }

        val accepted =
            PhoneCastAccessibilityService.tapOrDrag(
                startX = startX,
                startY = startY,
                endX = endX,
                endY = endY,
                durationMs = json.optLong("durationMs", 220L)
            )

        if (!accepted) {
            notifyRemoteControlUnavailable()
        }
    }

    private fun handleRemoteKey(
        json: JSONObject
    ) {

        if (!isAuthorizedInputRequest(json)) {
            return
        }

        val key =
            json.optString("key").uppercase()

        if (
            key.isBlank() ||
            !PhoneCastAccessibilityService.performKey(key)
        ) {
            notifyRemoteControlUnavailable()
        }
    }

    private fun notifyRemoteControlUnavailable() {

        runOnUiThread {
            Toast.makeText(
                this,
                "Enable PhoneCast in Accessibility settings to control this phone.",
                Toast.LENGTH_LONG
            ).show()
        }

        sendJsonToActiveLaptop(
            JSONObject().apply {
                put("type", "REMOTE_CONTROL_UNAVAILABLE")
                put("requestId", activeRequestId ?: "")
                put("reason", "ACCESSIBILITY_SERVICE_DISABLED")
            }
        )
    }

    // =========================================================
    // CONNECTION REQUEST
    // =========================================================

    private fun handleConnectionRequest(
        json: JSONObject,
        socket: Socket,
        writer: PrintWriter
    ) {

        if (
            pendingRequest != null ||
            activeSocket != null
        ) {

            sendJson(
                writer,
                JSONObject().apply {

                    put(
                        "type",
                        "REQUEST_REJECTED"
                    )

                    put(
                        "reason",
                        "ANOTHER_SESSION_ACTIVE"
                    )
                }
            )

            return
        }

        val requestId =
            json.optString(
                "requestId"
            )

        if (requestId.isBlank()) {

            Log.w(
                TAG,
                "Ignoring request without requestId."
            )

            return
        }

        val laptopName =
            json.optString(
                "laptopName",
                "Unknown PC"
            ).ifBlank {
                "Unknown PC"
            }

        val messageText =
            json.optString(
                "message",
                "$laptopName wants to connect"
            )

        val request =
            ConnectionRequest(
                requestId = requestId,
                laptopName = laptopName,
                message = messageText
            )

        pendingSocket =
            socket

        pendingWriter =
            writer

        runOnUiThread {

            if (!activityDestroyed.get()) {

                pendingRequest =
                    request
            }
        }

        Log.d(
            TAG,
            "Connection request waiting for user: $laptopName"
        )
    }

    // =========================================================
    // ACCEPT CONNECTION
    // =========================================================

    private fun acceptConnection(
        request: ConnectionRequest
    ) {

        if (
            pendingRequest?.requestId !=
            request.requestId
        ) {

            Log.w(
                TAG,
                "Ignoring stale connection request."
            )

            return
        }

        if (authenticationInProgress) {

            Log.w(
                TAG,
                "Authentication already in progress."
            )

            return
        }

        val writer =
            pendingWriter

        val socket =
            pendingSocket

        if (
            writer == null ||
            socket == null ||
            socket.isClosed
        ) {

            Log.e(
                TAG,
                "Cannot accept connection: session socket unavailable."
            )

            clearPendingConnection(
                closeSocket = true
            )

            Toast.makeText(
                this,
                "Connection is no longer available.",
                Toast.LENGTH_SHORT
            ).show()

            return
        }

        // Move pending connection into active session.

        activeRequestId =
            request.requestId

        activeLaptopName =
            request.laptopName

        activeSocket =
            socket

        activeWriter =
            writer

        pendingRequest = null

        pendingSocket = null

        pendingWriter = null

        authenticationInProgress = true

        authenticated = false

        sendJson(
            writer,
            JSONObject().apply {

                put(
                    "type",
                    "REQUEST_ACCEPTED"
                )

                put(
                    "requestId",
                    request.requestId
                )

                put(
                    "status",
                    "AUTHENTICATION_REQUIRED"
                )
            }
        )

        Log.d(
            TAG,
            "Connection accepted: ${request.laptopName}"
        )

        authenticateConnectionSession()
    }

    // =========================================================
    // CONNECTION AUTHENTICATION
    // =========================================================

    private fun authenticateConnectionSession() {

        val socket =
            activeSocket

        val writer =
            activeWriter

        val requestId =
            activeRequestId

        if (
            socket == null ||
            writer == null ||
            requestId.isNullOrBlank()
        ) {

            Log.e(
                TAG,
                "Connection authentication cannot start: active session missing."
            )

            terminateActiveSession(
                reason = "SESSION_NOT_AVAILABLE",
                notifyLaptop = true
            )

            return
        }

        val biometricManager =
            BiometricManager.from(this)

        val authenticators =
            BiometricManager.Authenticators.BIOMETRIC_STRONG or
                    BiometricManager.Authenticators.DEVICE_CREDENTIAL

        val capability =
            biometricManager.canAuthenticate(
                authenticators
            )

        if (
            capability !=
            BiometricManager.BIOMETRIC_SUCCESS
        ) {

            val reason =
                when (capability) {

                    BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE ->
                        "NO_BIOMETRIC_HARDWARE"

                    BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE ->
                        "AUTHENTICATION_HARDWARE_UNAVAILABLE"

                    BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED ->
                        "NO_DEVICE_CREDENTIAL_CONFIGURED"

                    else ->
                        "DEVICE_AUTHENTICATION_UNAVAILABLE"
                }

            Log.e(
                TAG,
                "Connection authentication unavailable: $reason"
            )

            sendJson(
                writer,
                JSONObject().apply {

                    put(
                        "type",
                        "AUTHENTICATION_FAILED"
                    )

                    put(
                        "requestId",
                        requestId
                    )

                    put(
                        "reason",
                        reason
                    )
                }
            )

            terminateActiveSession(
                reason = reason,
                notifyLaptop = false
            )

            runOnUiThread {

                Toast.makeText(
                    this,
                    "Device authentication is required for PhoneCast.",
                    Toast.LENGTH_LONG
                ).show()
            }

            return
        }

        sendJson(
            writer,
            JSONObject().apply {

                put(
                    "type",
                    "AUTHENTICATION_REQUIRED"
                )

                put(
                    "requestId",
                    requestId
                )
            }
        )

        val executor =
            ContextCompat.getMainExecutor(this)

        val biometricPrompt =
            BiometricPrompt(
                this,
                executor,

                object :
                    BiometricPrompt.AuthenticationCallback() {

                    override fun onAuthenticationSucceeded(
                        result: BiometricPrompt.AuthenticationResult
                    ) {

                        super.onAuthenticationSucceeded(
                            result
                        )

                        handleConnectionAuthenticationSuccess()
                    }

                    override fun onAuthenticationError(
                        errorCode: Int,
                        errString: CharSequence
                    ) {

                        super.onAuthenticationError(
                            errorCode,
                            errString
                        )

                        Log.d(
                            TAG,
                            "Connection authentication error: " +
                                    "$errorCode / $errString"
                        )

                        handleConnectionAuthenticationFailure(
                            errorCode = errorCode,
                            errorMessage = errString.toString()
                        )
                    }

                    override fun onAuthenticationFailed() {

                        super.onAuthenticationFailed()

                        Log.d(
                            TAG,
                            "Connection authentication attempt failed."
                        )
                    }
                }
            )

        /*
         * DEVICE_CREDENTIAL is already included.
         *
         * Do NOT use setNegativeButtonText()
         * together with DEVICE_CREDENTIAL.
         */

        val promptInfo =
            BiometricPrompt.PromptInfo.Builder()
                .setTitle(
                    "Authorize PhoneCast Connection"
                )
                .setSubtitle(
                    "Authenticate to allow this laptop to access your phone"
                )
                .setDescription(
                    "PhoneCast requires your device security every time a new connection is accepted."
                )
                .setAllowedAuthenticators(
                    authenticators
                )
                .build()

        try {

            biometricPrompt.authenticate(
                promptInfo
            )

            Log.d(
                TAG,
                "Android connection authentication prompt displayed."
            )

        } catch (
            exception: Exception
        ) {

            Log.e(
                TAG,
                "Unable to display authentication prompt.",
                exception
            )

            handleConnectionAuthenticationFailure(
                errorCode = -1,
                errorMessage =
                    "Unable to start device authentication."
            )
        }
    }

    // =========================================================
    // AUTHENTICATION SUCCESS
    // =========================================================

    private fun handleConnectionAuthenticationSuccess() {

        val writer =
            activeWriter

        val requestId =
            activeRequestId

        if (
            writer == null ||
            requestId.isNullOrBlank()
        ) {

            Log.e(
                TAG,
                "Authentication succeeded but active session is missing."
            )

            terminateActiveSession(
                reason = "SESSION_LOST_AFTER_AUTHENTICATION",
                notifyLaptop = false
            )

            return
        }

        authenticationInProgress = false

        authenticated = true

        sendJson(
            writer,
            JSONObject().apply {

                put(
                    "type",
                    "AUTHENTICATION_SUCCESS"
                )

                put(
                    "requestId",
                    requestId
                )

                put(
                    "status",
                    "AUTHENTICATED"
                )
            }
        )

        Log.d(
            TAG,
            "PhoneCast connection authentication SUCCESS."
        )

        runOnUiThread {

            Toast.makeText(
                this,
                "Connection authenticated.",
                Toast.LENGTH_SHORT
            ).show()
        }

        /*
         * Authentication succeeded.
         *
         * Now request Android's mandatory
         * MediaProjection screen-capture permission.
         */

        requestScreenCapturePermission()
    }

    // =========================================================
    // MEDIA PROJECTION PERMISSION
    // =========================================================

    private fun requestScreenCapturePermission() {

        if (!authenticated) {

            Log.e(
                TAG,
                "Cannot request screen capture before authentication."
            )

            return
        }

        if (screenCaptureRequestInProgress) {

            Log.d(
                TAG,
                "Screen capture permission request already active."
            )

            return
        }

        if (screenCaptureActive) {

            Log.d(
                TAG,
                "Screen capture is already active."
            )

            return
        }

        screenCaptureRequestInProgress = true

        val manager =
            getSystemService(
                MEDIA_PROJECTION_SERVICE
            ) as MediaProjectionManager

        val captureIntent =
            manager.createScreenCaptureIntent()

        Log.d(
            TAG,
            "Launching Android MediaProjection permission dialog."
        )

        try {

            screenCaptureLauncher.launch(
                captureIntent
            )

        } catch (
            exception: Exception
        ) {

            screenCaptureRequestInProgress = false

            Log.e(
                TAG,
                "Unable to launch MediaProjection permission.",
                exception
            )

            sendScreenCaptureFailure(
                "MEDIA_PROJECTION_DIALOG_FAILED"
            )
        }
    }

    // =========================================================
    // MEDIA PROJECTION RESULT
    // =========================================================

    private fun handleScreenCaptureResult(
        resultCode: Int,
        data: Intent?
    ) {

        screenCaptureRequestInProgress = false

        if (
            resultCode != Activity.RESULT_OK ||
            data == null
        ) {

            Log.w(
                TAG,
                "MediaProjection permission was not granted."
            )

            sendScreenCaptureFailure(
                "SCREEN_CAPTURE_PERMISSION_DENIED"
            )

            terminateActiveSession(
                reason = "SCREEN_CAPTURE_PERMISSION_DENIED",
                notifyLaptop = false
            )

            runOnUiThread {

                Toast.makeText(
                    this,
                    "Screen sharing permission was denied.",
                    Toast.LENGTH_LONG
                ).show()
            }

            return
        }

        readDisplayMetrics()

        Log.d(
            TAG,
            "MediaProjection permission granted."
        )

        Log.d(
            TAG,
            "Capture resolution: " +
                    "${captureWidth}x${captureHeight}"
        )

        Log.d(
            TAG,
            "Capture density: $captureDensity"
        )

        startScreenCaptureService(
            resultCode = resultCode,
            data = data
        )
    }

    // =========================================================
    // DISPLAY METRICS
    // =========================================================

    @Suppress("DEPRECATION")
    private fun readDisplayMetrics() {

        try {

            val metrics =
                DisplayMetrics()

            windowManager
                .defaultDisplay
                .getRealMetrics(metrics)

            if (
                metrics.widthPixels > 0 &&
                metrics.heightPixels > 0
            ) {

                captureWidth =
                    metrics.widthPixels

                captureHeight =
                    metrics.heightPixels
            }

            if (metrics.densityDpi > 0) {

                captureDensity =
                    metrics.densityDpi
            }

        } catch (
            exception: Exception
        ) {

            Log.e(
                TAG,
                "Unable to read display metrics. Using defaults.",
                exception
            )

            captureWidth =
                DEFAULT_CAPTURE_WIDTH

            captureHeight =
                DEFAULT_CAPTURE_HEIGHT

            captureDensity =
                DEFAULT_CAPTURE_DENSITY
        }
    }

    // =========================================================
    // START SCREEN CAPTURE SERVICE
    // =========================================================

    private fun startScreenCaptureService(
        resultCode: Int,
        data: Intent
    ) {

        val requestId =
            activeRequestId

        if (
            requestId.isNullOrBlank()
        ) {

            Log.e(
                TAG,
                "Cannot start screen capture: requestId missing."
            )

            sendScreenCaptureFailure(
                "REQUEST_ID_MISSING"
            )

            return
        }

        val serviceIntent =
            Intent(
                this,
                ScreenCaptureService::class.java
            ).apply {

                action =
                    ScreenCaptureService.ACTION_START

                putExtra(
                    ScreenCaptureService.EXTRA_RESULT_CODE,
                    resultCode
                )

                putExtra(
                    ScreenCaptureService.EXTRA_RESULT_DATA,
                    data
                )

                putExtra(
                    ScreenCaptureService.EXTRA_WIDTH,
                    captureWidth
                )

                putExtra(
                    ScreenCaptureService.EXTRA_HEIGHT,
                    captureHeight
                )

                putExtra(
                    ScreenCaptureService.EXTRA_DENSITY,
                    captureDensity
                )
            }

        try {

            ContextCompat.startForegroundService(
                this,
                serviceIntent
            )

            Log.d(
                TAG,
                "ScreenCaptureService start requested."
            )

            sendJsonToActiveLaptop(
                JSONObject().apply {

                    put(
                        "type",
                        "SCREEN_CAPTURE_STARTED"
                    )

                    put(
                        "requestId",
                        requestId
                    )

                    put(
                        "status",
                        "STARTING"
                    )

                    put(
                        "width",
                        captureWidth
                    )

                    put(
                        "height",
                        captureHeight
                    )

                    put(
                        "density",
                        captureDensity
                    )

                    put(
                        "codec",
                        "H264"
                    )
                }
            )

        } catch (
            exception: Exception
        ) {

            Log.e(
                TAG,
                "Failed to start ScreenCaptureService.",
                exception
            )

            sendScreenCaptureFailure(
                "SCREEN_CAPTURE_SERVICE_START_FAILED"
            )

            terminateActiveSession(
                reason = "SCREEN_CAPTURE_SERVICE_START_FAILED",
                notifyLaptop = false
            )
        }
    }

    // =========================================================
    // VIDEO SERVER READY
    // =========================================================

    private fun handleVideoServerReady(
        port: Int
    ) {

        if (port <= 0) {

            Log.e(
                TAG,
                "Invalid video server port: $port"
            )

            sendScreenCaptureFailure(
                "INVALID_VIDEO_SERVER_PORT"
            )

            return
        }

        videoServerPort =
            port

        screenCaptureActive = true

        val requestId =
            activeRequestId

        val writer =
            activeWriter

        if (
            requestId.isNullOrBlank() ||
            writer == null
        ) {

            Log.e(
                TAG,
                "Video server ready but active laptop session is missing."
            )

            stopScreenCaptureService()

            return
        }

        /*
         * The control TCP connection tells the laptop
         * where the separate binary H.264 TCP stream is.
         */

        sendJson(
            writer,
            JSONObject().apply {

                put(
                    "type",
                    "VIDEO_STREAM_READY"
                )

                put(
                    "requestId",
                    requestId
                )

                put(
                    "videoPort",
                    port
                )

                put(
                    "host",
                    "PHONECAST_DEVICE"
                )

                put(
                    "width",
                    captureWidth
                )

                put(
                    "height",
                    captureHeight
                )

                put(
                    "fps",
                    60
                )

                put(
                    "bitrate",
                    12_000_000
                )

                put(
                    "codec",
                    "H264"
                )

                put(
                    "transport",
                    "TCP"
                )

                put(
                    "status",
                    "READY"
                )
            }
        )

        Log.d(
            TAG,
            "H.264 video server READY on port $port"
        )

        runOnUiThread {

            Toast.makeText(
                this,
                "Screen sharing started.",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    // =========================================================
    // VIDEO SERVER STOPPED
    // =========================================================

    private fun handleVideoServerStopped() {

        Log.d(
            TAG,
            "Video server stopped."
        )

        val requestId =
            activeRequestId

        screenCaptureActive = false

        videoServerPort = -1

        if (!requestId.isNullOrBlank()) {

            sendJsonToActiveLaptop(
                JSONObject().apply {

                    put(
                        "type",
                        "VIDEO_STREAM_STOPPED"
                    )

                    put(
                        "requestId",
                        requestId
                    )

                    put(
                        "status",
                        "STOPPED"
                    )
                }
            )
        }
    }

    // =========================================================
    // SCREEN CAPTURE FAILURE
    // =========================================================

    private fun sendScreenCaptureFailure(
        reason: String
    ) {

        val requestId =
            activeRequestId

        if (requestId.isNullOrBlank()) {
            return
        }

        sendJsonToActiveLaptop(
            JSONObject().apply {

                put(
                    "type",
                    "SCREEN_CAPTURE_FAILED"
                )

                put(
                    "requestId",
                    requestId
                )

                put(
                    "reason",
                    reason
                )

                put(
                    "status",
                    "FAILED"
                )
            }
        )

        Log.e(
            TAG,
            "Screen capture failed: $reason"
        )
    }

    // =========================================================
    // STOP SCREEN CAPTURE SERVICE
    // =========================================================

    private fun stopScreenCaptureService() {

        try {

            val serviceIntent =
                Intent(
                    this,
                    ScreenCaptureService::class.java
                ).apply {

                    action =
                        ScreenCaptureService.ACTION_STOP
                }

            startService(
                serviceIntent
            )

            Log.d(
                TAG,
                "ScreenCaptureService stop requested."
            )

        } catch (
            exception: Exception
        ) {

            Log.e(
                TAG,
                "Failed to stop ScreenCaptureService.",
                exception
            )
        }

        screenCaptureActive = false

        videoServerPort = -1
    }

    // =========================================================
    // AUTHENTICATION FAILURE
    // =========================================================

    private fun handleConnectionAuthenticationFailure(
        errorCode: Int,
        errorMessage: String
    ) {

        authenticationInProgress = false

        authenticated = false

        val writer =
            activeWriter

        val requestId =
            activeRequestId

        Log.d(
            TAG,
            "Connection authentication failed: " +
                    "$errorCode / $errorMessage"
        )

        if (
            writer != null &&
            !requestId.isNullOrBlank()
        ) {

            sendJson(
                writer,
                JSONObject().apply {

                    put(
                        "type",
                        "AUTHENTICATION_FAILED"
                    )

                    put(
                        "requestId",
                        requestId
                    )

                    put(
                        "reason",
                        errorMessage
                    )
                }
            )
        }

        runOnUiThread {

            Toast.makeText(
                this,
                "Connection authentication cancelled.",
                Toast.LENGTH_SHORT
            ).show()
        }

        terminateActiveSession(
            reason = "AUTHENTICATION_FAILED",
            notifyLaptop = false
        )
    }

    // =========================================================
    // REJECT CONNECTION
    // =========================================================

    private fun rejectConnection(
        request: ConnectionRequest
    ) {

        if (
            pendingRequest?.requestId !=
            request.requestId
        ) {

            Log.w(
                TAG,
                "Ignoring stale rejection."
            )

            return
        }

        val writer =
            pendingWriter

        if (writer != null) {

            sendJson(
                writer,
                JSONObject().apply {

                    put(
                        "type",
                        "REQUEST_REJECTED"
                    )

                    put(
                        "requestId",
                        request.requestId
                    )

                    put(
                        "reason",
                        "USER_REJECTED"
                    )
                }
            )
        }

        Log.d(
            TAG,
            "Connection rejected: ${request.laptopName}"
        )

        clearPendingConnection(
            closeSocket = true
        )
    }

    // =========================================================
    // REMOTE TERMINATION
    // =========================================================

    private fun handleRemoteTermination(
        json: JSONObject
    ) {

        val requestId =
            json.optString(
                "requestId"
            )

        Log.d(
            TAG,
            "Laptop requested session termination: $requestId"
        )

        if (
            requestId.isNotBlank() &&
            activeRequestId != requestId
        ) {

            Log.w(
                TAG,
                "Ignoring termination for unknown session."
            )

            return
        }

        terminateActiveSession(
            reason = "REMOTE_TERMINATION",
            notifyLaptop = false
        )

        runOnUiThread {

            Toast.makeText(
                this,
                "PhoneCast connection terminated.",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    // =========================================================
    // CLEAR PENDING CONNECTION
    // =========================================================

    private fun clearPendingConnection(
        closeSocket: Boolean
    ) {

        pendingRequest = null

        pendingWriter = null

        val socket =
            pendingSocket

        pendingSocket = null

        if (
            closeSocket &&
            socket != null
        ) {

            try {

                if (!socket.isClosed) {
                    socket.close()
                }

            } catch (
                exception: Exception
            ) {

                Log.d(
                    TAG,
                    "Pending socket close failed.",
                    exception
                )
            }
        }
    }

    // =========================================================
    // TERMINATE ACTIVE SESSION
    // =========================================================

    private fun terminateActiveSession(
        reason: String,
        notifyLaptop: Boolean
    ) {

        val writer =
            activeWriter

        val socket =
            activeSocket

        val requestId =
            activeRequestId

        Log.d(
            TAG,
            "Terminating active session. Reason: $reason"
        )

        PhoneCastAccessibilityService.cancelTouch()

        /*
         * Stop screen capture BEFORE clearing the session.
         */

        if (
            screenCaptureActive ||
            videoServerPort > 0
        ) {

            stopScreenCaptureService()
        }

        if (
            notifyLaptop &&
            writer != null &&
            !requestId.isNullOrBlank()
        ) {

            sendJson(
                writer,
                JSONObject().apply {

                    put(
                        "type",
                        "SESSION_TERMINATED"
                    )

                    put(
                        "requestId",
                        requestId
                    )

                    put(
                        "reason",
                        reason
                    )
                }
            )
        }

        authenticationInProgress = false

        authenticated = false

        screenCaptureRequestInProgress = false

        screenCaptureActive = false

        videoServerPort = -1

        activeRequestId = null

        activeLaptopName = null

        activeWriter = null

        activeSocket = null

        if (socket != null) {

            try {

                if (!socket.isClosed) {
                    socket.close()
                }

            } catch (
                exception: Exception
            ) {

                Log.d(
                    TAG,
                    "Active socket close failed.",
                    exception
                )
            }
        }

        Log.d(
            TAG,
            "Active PhoneCast session cleared."
        )
    }

    // =========================================================
    // SEND JSON TO ACTIVE LAPTOP
    // =========================================================

    private fun sendJsonToActiveLaptop(
        json: JSONObject
    ) {

        val writer =
            activeWriter

        if (writer == null) {

            Log.w(
                TAG,
                "Cannot send message: active writer unavailable."
            )

            return
        }

        sendJson(
            writer,
            json
        )
    }

    // =========================================================
    // JSON SEND
    // =========================================================

    private fun sendJson(
        writer: PrintWriter,
        json: JSONObject
    ) {

        val payload =
            json.toString()

        /*
         * PrintWriter.flush() performs a blocking socket write. Android
         * invokes several connection callbacks on the main thread, so doing
         * this inline raises NetworkOnMainThreadException and drops the
         * control message. A single executor preserves message ordering
         * while keeping all network I/O off the UI thread.
         */
        try {
            controlWriteExecutor.execute {
                try {
                    synchronized(writer) {
                        writer.println(payload)
                        writer.flush()
                    }

                    if (writer.checkError()) {
                        Log.e(
                            TAG,
                            "Control message write failed (${payload.length} chars): $payload"
                        )
                    } else {
                        Log.d(
                            TAG,
                            "Outgoing control message (${payload.length} chars): $payload"
                        )
                    }
                } catch (exception: Exception) {
                    Log.e(
                        TAG,
                        "Failed to send JSON.",
                        exception
                    )
                }
            }
        } catch (exception: Exception) {
            Log.e(
                TAG,
                "Unable to queue control message.",
                exception
            )
        }
    }

    // =========================================================
    // PAGE STATE
    // =========================================================

    private fun onboardingPageToInt(): Int {

        return when (onboardingPage) {

            PhoneCastOnboardingPage.Welcome ->
                0

            PhoneCastOnboardingPage.Name ->
                1

            PhoneCastOnboardingPage.Security ->
                2
        }
    }

    // =========================================================
    // ACTIVITY DESTROY
    // =========================================================

    override fun onDestroy() {

        activityDestroyed.set(true)

        /*
         * Stop capture first.
         */

        try {

            stopScreenCaptureService()

        } catch (
            exception: Exception
        ) {

            Log.e(
                TAG,
                "Failed to stop screen capture service.",
                exception
            )
        }

        /*
         * Remove video receiver.
         */

        try {

            unregisterReceiver(
                videoServerReceiver
            )

        } catch (
            exception: Exception
        ) {

            Log.d(
                TAG,
                "Video receiver was already unregistered.",
                exception
            )
        }

        /*
         * Stop NSD advertisement.
         */

        try {

            phoneCastDiscovery.unregister()

        } catch (
            exception: Exception
        ) {

            Log.e(
                TAG,
                "Failed to unregister PhoneCast service.",
                exception
            )
        }

        /*
         * Clear pending connection.
         */

        try {

            clearPendingConnection(
                closeSocket = true
            )

        } catch (
            exception: Exception
        ) {

            Log.e(
                TAG,
                "Failed to clear pending connection.",
                exception
            )
        }

        /*
         * Terminate active connection.
         */

        try {

            terminateActiveSession(
                reason = "ACTIVITY_DESTROYED",
                notifyLaptop = false
            )

        } catch (
            exception: Exception
        ) {

            Log.e(
                TAG,
                "Failed to terminate active session.",
                exception
            )
        }

        /*
         * Stop PhoneCast control server.
         */

        try {

            phoneCastServer.stop()

        } catch (
            exception: Exception
        ) {

            Log.e(
                TAG,
                "Failed to stop PhoneCast server.",
                exception
            )
        }

        /*
         * Close database.
         */

        try {

            database.close()

        } catch (
            exception: Exception
        ) {

            Log.e(
                TAG,
                "Failed to close database.",
                exception
            )
        }

        super.onDestroy()
    }
}