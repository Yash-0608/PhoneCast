package com.phonecast.app.capture

import android.media.MediaCodec
import android.media.MediaFormat
import android.util.Log
import java.io.BufferedOutputStream
import java.io.DataOutputStream
import java.io.IOException
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class H264StreamServer {

    companion object {

        private const val TAG =
            "PhoneCastVideo"

        /*
         * Packet types.
         *
         * HEADER:
         * Contains H.264 codec configuration such as SPS/PPS.
         *
         * FRAME:
         * Contains an encoded H.264 frame.
         */
        private const val PACKET_HEADER =
            1

        private const val PACKET_FRAME =
            2

        /*
         * Protocol version.
         */
        private const val PROTOCOL_VERSION =
            1

        /*
         * Maximum payload accepted by this protocol.
         *
         * 8 MB is comfortably above the expected size of a
         * single H.264 screen frame.
         */
        private const val MAX_PACKET_SIZE =
            8 * 1024 * 1024
    }

    private val executor =
        Executors.newCachedThreadPool()

    private var serverSocket:
        ServerSocket? = null

    private var clientSocket:
        Socket? = null

    private var output:
        DataOutputStream? = null

    private val running =
        AtomicBoolean(false)

    private val clientConnected =
        AtomicBoolean(false)

    private var serverPort =
        -1

    // ---------------------------------------------------------
    // CALLBACKS
    // ---------------------------------------------------------

    var onClientConnected:
        (() -> Unit)? = null

    var onClientDisconnected:
        (() -> Unit)? = null

    var onError:
        ((Exception) -> Unit)? = null

    // ---------------------------------------------------------
    // PORT
    // ---------------------------------------------------------

    val port: Int
        get() = serverPort

    // ---------------------------------------------------------
    // START SERVER
    // ---------------------------------------------------------

    fun start(): Int {

        if (running.get()) {

            Log.d(
                TAG,
                "Video server already running on port $serverPort"
            )

            return serverPort
        }

        try {

            /*
             * Port 0 asks Android to select a free local TCP port.
             */
            serverSocket =
                ServerSocket(0)

            serverPort =
                serverSocket!!.localPort

            running.set(true)

            Log.d(
                TAG,
                "H.264 video server started."
            )

            Log.d(
                TAG,
                "Video TCP port: $serverPort"
            )

            executor.execute {
                acceptClient()
            }

            return serverPort

        } catch (
            exception: Exception
        ) {

            Log.e(
                TAG,
                "Failed to start H.264 video server.",
                exception
            )

            stop()

            onError?.invoke(
                exception
            )

            throw exception
        }
    }

    // ---------------------------------------------------------
    // ACCEPT CLIENT
    // ---------------------------------------------------------

    private fun acceptClient() {

        try {

            val server =
                serverSocket
                    ?: return

            while (
                running.get()
            ) {

                Log.d(
                    TAG,
                    "Waiting for laptop video connection..."
                )

                val socket =
                    server.accept()

                if (!running.get()) {

                    try {
                        socket.close()
                    } catch (_: Exception) {
                    }

                    break
                }

                /*
                 * Only one video receiver is supported for now.
                 *
                 * This matches PhoneCast's one-laptop-per-session
                 * architecture.
                 */
                synchronized(this) {

                    if (
                        clientConnected.get()
                    ) {

                        Log.w(
                            TAG,
                            "Video client already connected. Rejecting new client."
                        )

                        try {
                            socket.close()
                        } catch (_: Exception) {
                        }

                        continue
                    }

                    clientSocket =
                        socket

                    output =
                        DataOutputStream(
                            BufferedOutputStream(
                                socket.getOutputStream()
                            )
                        )

                    clientConnected.set(true)
                }

                Log.d(
                    TAG,
                    "Laptop video connection established."
                )

                Log.d(
                    TAG,
                    "Laptop address: ${socket.inetAddress.hostAddress}"
                )

                onClientConnected?.invoke()

                /*
                 * Keep this worker alive while the client is
                 * connected.
                 *
                 * The actual video stream is sent from the
                 * encoder callback through sendFrame().
                 */
                monitorClient(
                    socket
                )
            }

        } catch (
            exception: Exception
        ) {

            if (
                running.get()
            ) {

                Log.e(
                    TAG,
                    "Video server error.",
                    exception
                )

                onError?.invoke(
                    exception
                )
            }
        }
    }

    // ---------------------------------------------------------
    // CLIENT MONITOR
    // ---------------------------------------------------------

    private fun monitorClient(
        socket: Socket
    ) {

        try {

            /*
             * We don't need to read video data from the laptop
             * yet.
             *
             * The socket is monitored so that disconnects can
             * be detected.
             */
            val input =
                socket.getInputStream()

            val buffer =
                ByteArray(1)

            while (
                running.get() &&
                !socket.isClosed &&
                clientConnected.get()
            ) {

                val result =
                    input.read(
                        buffer
                    )

                if (
                    result == -1
                ) {
                    break
                }
            }

        } catch (
            exception: IOException
        ) {

            if (
                running.get()
            ) {

                Log.d(
                    TAG,
                    "Laptop video connection ended."
                )
            }

        } finally {

            disconnectClient()
        }
    }

    // ---------------------------------------------------------
    // SEND CODEC HEADER
    // ---------------------------------------------------------

    @Synchronized
    fun sendCodecFormat(
        format: MediaFormat
    ) {

        if (
            !clientConnected.get()
        ) {

            Log.d(
                TAG,
                "No laptop video client. Codec format not sent."
            )

            return
        }

        try {

            val csd0 =
                getByteBufferData(
                    format,
                    "csd-0"
                )

            val csd1 =
                getByteBufferData(
                    format,
                    "csd-1"
                )

            /*
             * HEADER payload:
             *
             * protocol version
             * width
             * height
             * frame rate
             * bitrate
             * csd-0 length
             * csd-0
             * csd-1 length
             * csd-1
             */
            val payloadSize =
                4 +
                    4 +
                    4 +
                    4 +
                    4 +
                    4 +
                    csd0.size +
                    4 +
                    csd1.size

            if (
                payloadSize >
                MAX_PACKET_SIZE
            ) {

                throw IOException(
                    "Codec header is too large."
                )
            }

            val stream =
                output
                    ?: return

            stream.writeInt(
                PACKET_HEADER
            )

            stream.writeInt(
                payloadSize
            )

            stream.writeInt(
                PROTOCOL_VERSION
            )

            stream.writeInt(
                format.getInteger(
                    MediaFormat.KEY_WIDTH
                )
            )

            stream.writeInt(
                format.getInteger(
                    MediaFormat.KEY_HEIGHT
                )
            )

            stream.writeInt(
                if (
                    format.containsKey(
                        MediaFormat.KEY_FRAME_RATE
                    )
                ) {
                    format.getInteger(
                        MediaFormat.KEY_FRAME_RATE
                    )
                } else {
                    60
                }
            )

            stream.writeInt(
                if (
                    format.containsKey(
                        MediaFormat.KEY_BIT_RATE
                    )
                ) {
                    format.getInteger(
                        MediaFormat.KEY_BIT_RATE
                    )
                } else {
                    0
                }
            )

            stream.writeInt(
                csd0.size
            )

            stream.write(
                csd0
            )

            stream.writeInt(
                csd1.size
            )

            stream.write(
                csd1
            )

            stream.flush()

            Log.d(
                TAG,
                "H.264 codec header sent."
            )

            Log.d(
                TAG,
                "SPS bytes: ${csd0.size}"
            )

            Log.d(
                TAG,
                "PPS bytes: ${csd1.size}"
            )

        } catch (
            exception: Exception
        ) {

            Log.e(
                TAG,
                "Failed to send H.264 codec header.",
                exception
            )

            disconnectClient()

            onError?.invoke(
                exception
            )
        }
    }

    // ---------------------------------------------------------
    // SEND ENCODED FRAME
    // ---------------------------------------------------------

    @Synchronized
    fun sendFrame(
        data: ByteArray,
        offset: Int,
        size: Int,
        presentationTimeUs: Long,
        flags: Int
    ) {

        if (
            !clientConnected.get()
        ) {

            return
        }

        if (
            size <= 0
        ) {

            return
        }

        if (
            size >
            MAX_PACKET_SIZE
        ) {

            Log.e(
                TAG,
                "H.264 frame too large: $size bytes"
            )

            return
        }

        try {

            val stream =
                output
                    ?: return

            /*
             * FRAME packet format:
             *
             * packet type
             * payload size
             * presentation timestamp
             * codec flags
             * H.264 payload
             */
            val payloadSize =
                8 +
                    4 +
                    size

            stream.writeInt(
                PACKET_FRAME
            )

            stream.writeInt(
                payloadSize
            )

            stream.writeLong(
                presentationTimeUs
            )

            stream.writeInt(
                flags
            )

            stream.write(
                data,
                offset,
                size
            )

            /*
             * Flush each encoded frame.
             *
             * This is intentionally simple for the first
             * transport implementation.
             *
             * Later we can optimize batching / buffering if
             * required for latency.
             */
            stream.flush()

        } catch (
            exception: Exception
        ) {

            Log.e(
                TAG,
                "Failed to send H.264 frame.",
                exception
            )

            disconnectClient()

            onError?.invoke(
                exception
            )
        }
    }

    // ---------------------------------------------------------
    // CLIENT STATUS
    // ---------------------------------------------------------

    fun isClientConnected():
            Boolean {

        return clientConnected.get()
    }

    // ---------------------------------------------------------
    // DISCONNECT CLIENT
    // ---------------------------------------------------------

    @Synchronized
    fun disconnectClient() {

        if (
            !clientConnected.getAndSet(false)
        ) {

            return
        }

        Log.d(
            TAG,
            "Disconnecting laptop video client."
        )

        try {
            output?.flush()
        } catch (_: Exception) {
        }

        try {
            output?.close()
        } catch (_: Exception) {
        }

        output =
            null

        try {
            clientSocket?.close()
        } catch (_: Exception) {
        }

        clientSocket =
            null

        onClientDisconnected?.invoke()
    }

    // ---------------------------------------------------------
    // STOP SERVER
    // ---------------------------------------------------------

    fun stop() {

        if (
            !running.getAndSet(false)
        ) {

            return
        }

        Log.d(
            TAG,
            "Stopping H.264 video server."
        )

        disconnectClient()

        try {
            serverSocket?.close()
        } catch (_: Exception) {
        }

        serverSocket =
            null

        serverPort =
            -1

        Log.d(
            TAG,
            "H.264 video server stopped."
        )
    }

    // ---------------------------------------------------------
    // EXTRACT CODEC DATA
    // ---------------------------------------------------------

    private fun getByteBufferData(
        format: MediaFormat,
        key: String
    ): ByteArray {

        if (
            !format.containsKey(key)
        ) {

            return ByteArray(0)
        }

        val buffer =
            format.getByteBuffer(
                key
            ) ?: return ByteArray(0)

        val duplicate =
            buffer.duplicate()

        val data =
            ByteArray(
                duplicate.remaining()
            )

        duplicate.get(
            data
        )

        return data
    }
}