package com.phonecast.app.capture

import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.MediaFormat
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import android.view.Surface
import androidx.core.app.NotificationCompat

class ScreenCaptureService : Service() {

    companion object {

        private const val TAG =
            "PhoneCastCapture"

        private const val CHANNEL_ID =
            "phonecast_screen_capture"

        private const val CHANNEL_NAME =
            "PhoneCast Screen Sharing"

        private const val NOTIFICATION_ID =
            4101

        const val ACTION_START =
            "com.phonecast.app.capture.START"

        const val ACTION_STOP =
            "com.phonecast.app.capture.STOP"

        /*
         * Broadcast sent when the H.264 video server
         * successfully starts.
         */
        const val ACTION_VIDEO_SERVER_READY =
            "com.phonecast.app.capture.VIDEO_SERVER_READY"

        /*
         * Broadcast sent when the video server stops.
         */
        const val ACTION_VIDEO_SERVER_STOPPED =
            "com.phonecast.app.capture.VIDEO_SERVER_STOPPED"

        /*
         * Video server TCP port.
         */
        const val EXTRA_VIDEO_PORT =
            "video_port"

        const val EXTRA_RESULT_CODE =
            "result_code"

        const val EXTRA_RESULT_DATA =
            "result_data"

        const val EXTRA_WIDTH =
            "width"

        const val EXTRA_HEIGHT =
            "height"

        const val EXTRA_DENSITY =
            "density"

        private const val DEFAULT_WIDTH =
            1080

        private const val DEFAULT_HEIGHT =
            2400

        private const val DEFAULT_DENSITY =
            420

        private const val TARGET_FPS =
            60

        /*
         * Initial H.264 bitrate.
         *
         * This can be tuned later after the actual
         * laptop receiver and network performance
         * are measured.
         */
        private const val TARGET_BITRATE =
            12_000_000

        private const val I_FRAME_INTERVAL =
            1
    }

    // ---------------------------------------------------------
    // MEDIA PROJECTION
    // ---------------------------------------------------------

    private var mediaProjection:
        MediaProjection? = null

    // ---------------------------------------------------------
    // VIRTUAL DISPLAY
    // ---------------------------------------------------------

    private var virtualDisplay:
        VirtualDisplay? = null

    // ---------------------------------------------------------
    // H.264 ENCODER
    // ---------------------------------------------------------

    private var h264Encoder:
        H264Encoder? = null

    private var encoderSurface:
        Surface? = null

    // ---------------------------------------------------------
    // VIDEO TCP SERVER
    // ---------------------------------------------------------

    private var videoServer:
        H264StreamServer? = null

    /*
     * We retain the latest codec format.
     *
     * This is important because the encoder may report its
     * output format before the laptop connects.
     *
     * When the laptop connects later, we immediately send
     * the cached format.
     */
    private var latestCodecFormat:
        MediaFormat? = null

    // ---------------------------------------------------------
    // STATE
    // ---------------------------------------------------------

    private var encodedFrameCount =
        0L

    private var captureStarted =
        false

    private val mainHandler =
        Handler(
            Looper.getMainLooper()
        )

    // ---------------------------------------------------------
    // SERVICE CREATED
    // ---------------------------------------------------------

    override fun onCreate() {

        super.onCreate()

        Log.d(
            TAG,
            "ScreenCaptureService created."
        )

        createNotificationChannel()
    }

    // ---------------------------------------------------------
    // SERVICE COMMAND
    // ---------------------------------------------------------

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int
    ): Int {

        if (intent == null) {

            Log.e(
                TAG,
                "Service started with null intent."
            )

            stopCaptureService()

            return START_NOT_STICKY
        }

        when (intent.action) {

            ACTION_START -> {

                if (!captureStarted) {

                    startCapture(
                        intent
                    )

                } else {

                    Log.d(
                        TAG,
                        "Screen capture is already running."
                    )
                }
            }

            ACTION_STOP -> {

                Log.d(
                    TAG,
                    "Stop command received."
                )

                stopCaptureService()
            }

            else -> {

                Log.w(
                    TAG,
                    "Unknown service action: ${intent.action}"
                )
            }
        }

        return START_NOT_STICKY
    }

    // ---------------------------------------------------------
    // START CAPTURE
    // ---------------------------------------------------------

    private fun startCapture(
        intent: Intent
    ) {

        try {

            /*
             * Start foreground service notification first.
             */
            startForegroundServiceNotification()

            // -------------------------------------------------
            // VALIDATE MEDIA PROJECTION RESULT
            // -------------------------------------------------

            val resultCode =
                intent.getIntExtra(
                    EXTRA_RESULT_CODE,
                    Activity.RESULT_CANCELED
                )

            /*
             * Activity.RESULT_OK is -1.
             *
             * We specifically compare against RESULT_OK.
             */
            if (
                resultCode !=
                Activity.RESULT_OK
            ) {

                Log.e(
                    TAG,
                    "Invalid MediaProjection result code: $resultCode"
                )

                stopCaptureService()

                return
            }

            Log.d(
                TAG,
                "Valid MediaProjection result code received."
            )

            val projectionData =
                getProjectionIntent(
                    intent
                )

            if (
                projectionData == null
            ) {

                Log.e(
                    TAG,
                    "MediaProjection permission data is missing."
                )

                stopCaptureService()

                return
            }

            // -------------------------------------------------
            // DISPLAY CONFIGURATION
            // -------------------------------------------------

            val width =
                intent.getIntExtra(
                    EXTRA_WIDTH,
                    DEFAULT_WIDTH
                )

            val height =
                intent.getIntExtra(
                    EXTRA_HEIGHT,
                    DEFAULT_HEIGHT
                )

            val density =
                intent.getIntExtra(
                    EXTRA_DENSITY,
                    DEFAULT_DENSITY
                )

            Log.d(
                TAG,
                "========================================"
            )

            Log.d(
                TAG,
                "Starting PhoneCast video pipeline."
            )

            Log.d(
                TAG,
                "Resolution: ${width}x${height}"
            )

            Log.d(
                TAG,
                "Density: $density"
            )

            Log.d(
                TAG,
                "Target FPS: $TARGET_FPS"
            )

            Log.d(
                TAG,
                "Target bitrate: $TARGET_BITRATE"
            )

            Log.d(
                TAG,
                "========================================"
            )

            // -------------------------------------------------
            // MEDIA PROJECTION
            // -------------------------------------------------

            val projectionManager =
                getSystemService(
                    MEDIA_PROJECTION_SERVICE
                ) as MediaProjectionManager

            mediaProjection =
                projectionManager.getMediaProjection(
                    resultCode,
                    projectionData
                )

            if (
                mediaProjection == null
            ) {

                Log.e(
                    TAG,
                    "MediaProjection could not be created."
                )

                stopCaptureService()

                return
            }

            /*
             * Register callback before creating VirtualDisplay.
             */
            mediaProjection!!.registerCallback(
                projectionCallback,
                mainHandler
            )

            // -------------------------------------------------
            // START VIDEO TCP SERVER
            // -------------------------------------------------

            startVideoServer()

            // -------------------------------------------------
            // CREATE H.264 ENCODER
            // -------------------------------------------------

            latestCodecFormat =
                null

            encodedFrameCount =
                0L

            h264Encoder =
                H264Encoder(

                    width =
                        width,

                    height =
                        height,

                    frameRate =
                        TARGET_FPS,

                    bitrate =
                        TARGET_BITRATE,

                    iFrameIntervalSeconds =
                        I_FRAME_INTERVAL,

                    onOutputFormat = {
                        format ->

                        /*
                         * Save the format so that it can be
                         * sent to a laptop that connects later.
                         */
                        latestCodecFormat =
                            format

                        Log.d(
                            TAG,
                            "H.264 output format available."
                        )

                        Log.d(
                            TAG,
                            format.toString()
                        )

                        /*
                         * If a laptop is already connected,
                         * send the codec configuration now.
                         */
                        videoServer?.let {
                            server ->

                            if (
                                server.isClientConnected()
                            ) {

                                server.sendCodecFormat(
                                    format
                                )
                            }
                        }
                    },

                    onEncodedFrame = {
                        data,
                        offset,
                        size,
                        presentationTimeUs,
                        flags ->

                        encodedFrameCount++

                        /*
                         * Send the H.264 frame to the connected
                         * laptop.
                         */
                        videoServer?.sendFrame(
                            data =
                                data,

                            offset =
                                offset,

                            size =
                                size,

                            presentationTimeUs =
                                presentationTimeUs,

                            flags =
                                flags
                        )

                        /*
                         * Log periodically so we can verify
                         * that the stream continues.
                         */
                        if (
                            encodedFrameCount == 1L ||
                            encodedFrameCount % 60L == 0L
                        ) {

                            Log.d(
                                TAG,
                                "H.264 encoded frame: " +
                                    "$encodedFrameCount" +
                                    " | bytes=$size" +
                                    " | pts=$presentationTimeUs" +
                                    " | flags=$flags" +
                                    " | laptopConnected=" +
                                    "${videoServer?.isClientConnected()}"
                            )
                        }
                    },

                    onError = {
                        exception ->

                        Log.e(
                            TAG,
                            "H.264 encoder error.",
                            exception
                        )
                    }
                )

            /*
             * Start the encoder.
             *
             * This returns the Surface that receives the
             * phone display frames.
             */
            encoderSurface =
                h264Encoder!!.start()

            Log.d(
                TAG,
                "H.264 encoder started successfully."
            )

            Log.d(
                TAG,
                "Encoder input Surface created."
            )

            // -------------------------------------------------
            // CREATE VIRTUAL DISPLAY
            // -------------------------------------------------

            /*
             * The phone display is now routed directly into
             * the H.264 encoder Surface.
             *
             * ImageReader is no longer involved.
             */
            virtualDisplay =
                mediaProjection!!.createVirtualDisplay(

                    "PhoneCastScreen",

                    width,

                    height,

                    density,

                    DisplayManager
                        .VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,

                    encoderSurface,

                    virtualDisplayCallback,

                    mainHandler
                )

            captureStarted =
                true

            Log.d(
                TAG,
                "========================================"
            )

            Log.d(
                TAG,
                "H.264 SCREEN CAPTURE STARTED."
            )

            Log.d(
                TAG,
                "VirtualDisplay -> H.264 Encoder"
            )

            Log.d(
                TAG,
                "H.264 Encoder -> Video TCP Server"
            )

            Log.d(
                TAG,
                "Waiting for laptop video connection..."
            )

            Log.d(
                TAG,
                "========================================")

            /*
             * If the codec format was produced extremely quickly
             * and a client connected during startup, make sure
             * the cached format is sent.
             */
            latestCodecFormat?.let {
                format ->

                videoServer?.let {
                    server ->

                    if (
                        server.isClientConnected()
                    ) {

                        server.sendCodecFormat(
                            format
                        )
                    }
                }
            }

        } catch (
            securityException:
            SecurityException
        ) {

            Log.e(
                TAG,
                "MediaProjection security error.",
                securityException
            )

            stopCaptureService()

        } catch (
            exception:
            Exception
        ) {

            Log.e(
                TAG,
                "Failed to start screen capture.",
                exception
            )

            stopCaptureService()
        }
    }

    // ---------------------------------------------------------
    // START VIDEO SERVER
    // ---------------------------------------------------------

    private fun startVideoServer() {

        if (
            videoServer != null
        ) {

            Log.d(
                TAG,
                "Video server already exists."
            )

            return
        }

        val server =
            H264StreamServer()

        /*
         * When the laptop connects to the video server,
         * immediately send the cached H.264 codec configuration.
         */
        server.onClientConnected = {

            Log.d(
                TAG,
                "Laptop connected to H.264 video server."
            )

            latestCodecFormat?.let {
                format ->

                server.sendCodecFormat(
                    format
                )
            }
        }

        server.onClientDisconnected = {

            Log.d(
                TAG,
                "Laptop disconnected from H.264 video server."
            )
        }

        server.onError = {
            exception ->

            Log.e(
                TAG,
                "H.264 video server error.",
                exception
            )
        }

        val port =
            server.start()

        videoServer =
            server

        Log.d(
            TAG,
            "========================================"
        )

        Log.d(
            TAG,
            "H.264 video server started."
        )

        Log.d(
            TAG,
            "Video TCP port: $port"
        )

        Log.d(
            TAG,
            "========================================"
        )

        /*
         * Tell MainActivity about the video server.
         *
         * MainActivity will use this information to notify
         * the laptop through the existing control connection.
         */
        val readyIntent =
            Intent(
                ACTION_VIDEO_SERVER_READY
            ).apply {

                setPackage(
                    packageName
                )

                putExtra(
                    EXTRA_VIDEO_PORT,
                    port
                )
            }

        sendBroadcast(
            readyIntent
        )
    }

    // ---------------------------------------------------------
    // MEDIA PROJECTION CALLBACK
    // ---------------------------------------------------------

    private val projectionCallback =
        object : MediaProjection.Callback() {

            override fun onStop() {

                Log.d(
                    TAG,
                    "MediaProjection stopped by Android or user."
                )

                stopCaptureResources()

                stopCaptureServiceOnly()
            }
        }

    // ---------------------------------------------------------
    // VIRTUAL DISPLAY CALLBACK
    // ---------------------------------------------------------

    private val virtualDisplayCallback =
        object : VirtualDisplay.Callback() {

            override fun onPaused() {

                Log.d(
                    TAG,
                    "VirtualDisplay paused."
                )
            }

            override fun onResumed() {

                Log.d(
                    TAG,
                    "VirtualDisplay resumed."
                )
            }

            override fun onStopped() {

                Log.d(
                    TAG,
                    "VirtualDisplay stopped."
                )
            }
        }

    // ---------------------------------------------------------
    // PROJECTION INTENT
    // ---------------------------------------------------------

    private fun getProjectionIntent(
        intent: Intent
    ): Intent? {

        return if (
            Build.VERSION.SDK_INT >=
            Build.VERSION_CODES.TIRAMISU
        ) {

            intent.getParcelableExtra(
                EXTRA_RESULT_DATA,
                Intent::class.java
            )

        } else {

            @Suppress("DEPRECATION")
            intent.getParcelableExtra(
                EXTRA_RESULT_DATA
            )
        }
    }

    // ---------------------------------------------------------
    // FOREGROUND SERVICE
    // ---------------------------------------------------------

    private fun startForegroundServiceNotification() {

        val notification =
            buildNotification()

        if (
            Build.VERSION.SDK_INT >=
            Build.VERSION_CODES.Q
        ) {

            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo
                    .FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            )

        } else {

            @Suppress("DEPRECATION")
            startForeground(
                NOTIFICATION_ID,
                notification
            )
        }
    }

    // ---------------------------------------------------------
    // NOTIFICATION
    // ---------------------------------------------------------

    private fun buildNotification():
            Notification {

        return NotificationCompat.Builder(
            this,
            CHANNEL_ID
        )
            .setSmallIcon(
                android.R.drawable.ic_menu_view
            )
            .setContentTitle(
                "PhoneCast screen sharing"
            )
            .setContentText(
                "Your phone screen is being shared with the connected laptop."
            )
            .setOngoing(true)
            .setCategory(
                NotificationCompat.CATEGORY_SERVICE
            )
            .setPriority(
                NotificationCompat.PRIORITY_LOW
            )
            .build()
    }

    private fun createNotificationChannel() {

        if (
            Build.VERSION.SDK_INT <
            Build.VERSION_CODES.O
        ) {
            return
        }

        val manager =
            getSystemService(
                Context.NOTIFICATION_SERVICE
            ) as NotificationManager

        val channel =
            NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {

                description =
                    "Shows when PhoneCast is sharing the phone screen."

                setShowBadge(false)
            }

        manager.createNotificationChannel(
            channel
        )
    }

    // ---------------------------------------------------------
    // RELEASE RESOURCES
    // ---------------------------------------------------------

    private fun stopCaptureResources() {

        Log.d(
            TAG,
            "Releasing screen capture resources."
        )

        /*
         * Stop VirtualDisplay first.
         */
        try {

            virtualDisplay?.release()

        } catch (
            exception:
            Exception
        ) {

            Log.e(
                TAG,
                "Failed to release VirtualDisplay.",
                exception
            )
        }

        virtualDisplay =
            null

        /*
         * Stop H.264 encoder.
         */
        try {

            h264Encoder?.stop()

        } catch (
            exception:
            Exception
        ) {

            Log.e(
                TAG,
                "Failed to stop H.264 encoder.",
                exception
            )
        }

        h264Encoder =
            null

        encoderSurface =
            null

        /*
         * Stop video TCP server.
         */
        try {

            videoServer?.stop()

        } catch (
            exception:
            Exception
        ) {

            Log.e(
                TAG,
                "Failed to stop H.264 video server.",
                exception
            )
        }

        videoServer =
            null

        latestCodecFormat =
            null

        /*
         * Tell MainActivity that the video server is gone.
         */
        try {

            val stoppedIntent =
                Intent(
                    ACTION_VIDEO_SERVER_STOPPED
                ).apply {

                    setPackage(
                        packageName
                    )
                }

            sendBroadcast(
                stoppedIntent
            )

        } catch (
            exception:
            Exception
        ) {

            Log.d(
                TAG,
                "Could not broadcast video server stopped.",
                exception
            )
        }

        /*
         * Unregister MediaProjection callback.
         */
        try {

            mediaProjection?.unregisterCallback(
                projectionCallback
            )

        } catch (
            exception:
            Exception
        ) {

            Log.d(
                TAG,
                "Projection callback unregister failed.",
                exception
            )
        }

        /*
         * Stop MediaProjection.
         */
        try {

            mediaProjection?.stop()

        } catch (
            exception:
            Exception
        ) {

            Log.d(
                TAG,
                "MediaProjection stop failed.",
                exception
            )
        }

        mediaProjection =
            null

        captureStarted =
            false

        encodedFrameCount =
            0L
    }

    // ---------------------------------------------------------
    // STOP SERVICE
    // ---------------------------------------------------------

    private fun stopCaptureService() {

        stopCaptureResources()

        stopCaptureServiceOnly()
    }

    private fun stopCaptureServiceOnly() {

        if (
            Build.VERSION.SDK_INT >=
            Build.VERSION_CODES.N
        ) {

            stopForeground(
                STOP_FOREGROUND_REMOVE
            )

        } else {

            @Suppress(
                "DEPRECATION"
            )

            stopForeground(
                true
            )
        }

        stopSelf()
    }

    // ---------------------------------------------------------
    // SERVICE BINDING
    // ---------------------------------------------------------

    override fun onBind(
        intent: Intent?
    ): IBinder? {

        return null
    }

    // ---------------------------------------------------------
    // SERVICE DESTROYED
    // ---------------------------------------------------------

    override fun onDestroy() {

        Log.d(
            TAG,
            "ScreenCaptureService destroyed."
        )

        stopCaptureResources()

        mainHandler.removeCallbacksAndMessages(
            null
        )

        super.onDestroy()
    }
}