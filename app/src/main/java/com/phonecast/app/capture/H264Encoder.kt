package com.phonecast.app.capture

import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.view.Surface
import java.util.concurrent.atomic.AtomicBoolean

class H264Encoder(
    private val width: Int,
    private val height: Int,
    private val frameRate: Int = 60,
    private val bitrate: Int = 12_000_000,
    private val iFrameIntervalSeconds: Int = 1,
    private val onOutputFormat: (MediaFormat) -> Unit,
    private val onEncodedFrame: (
        data: ByteArray,
        offset: Int,
        size: Int,
        presentationTimeUs: Long,
        flags: Int
    ) -> Unit,
    private val onError: (Exception) -> Unit
) {

    private var codec: MediaCodec? = null

    private var inputSurface: Surface? = null

    private var drainThread: Thread? = null

    private val running =
        AtomicBoolean(false)

    private val bufferInfo =
        MediaCodec.BufferInfo()

    // ---------------------------------------------------------
    // START
    // ---------------------------------------------------------

    fun start(): Surface {

        if (running.get()) {

            throw IllegalStateException(
                "H264Encoder is already running."
            )
        }

        try {

            val format =
                MediaFormat.createVideoFormat(
                    MediaFormat.MIMETYPE_VIDEO_AVC,
                    width,
                    height
                )

            /*
             * We provide frames through a Surface.
             *
             * MediaProjection / VirtualDisplay can therefore
             * write directly into the encoder pipeline without
             * copying every frame through ImageReader.
             */
            format.setInteger(
                MediaFormat.KEY_COLOR_FORMAT,
                MediaCodecInfo.CodecCapabilities
                    .COLOR_FormatSurface
            )

            /*
             * Target frame rate.
             */
            format.setInteger(
                MediaFormat.KEY_FRAME_RATE,
                frameRate
            )

            /*
             * Initial bitrate.
             *
             * 12 Mbps is a reasonable starting point for
             * 1080p screen content. We can tune this later.
             */
            format.setInteger(
                MediaFormat.KEY_BIT_RATE,
                bitrate
            )

            /*
             * Generate an I-frame periodically.
             *
             * This is useful for joining/recovering a stream.
             */
            format.setInteger(
                MediaFormat.KEY_I_FRAME_INTERVAL,
                iFrameIntervalSeconds
            )

            /*
             * Request low-latency operation when supported.
             */
            try {

                format.setInteger(
                    MediaFormat.KEY_PRIORITY,
                    0
                )

            } catch (_: Exception) {
                // Optional codec parameter.
            }

            val encoder =
                MediaCodec.createEncoderByType(
                    MediaFormat.MIMETYPE_VIDEO_AVC
                )

            encoder.configure(
                format,
                null,
                null,
                MediaCodec.CONFIGURE_FLAG_ENCODE
            )

            /*
             * This Surface becomes the destination for
             * MediaProjection's VirtualDisplay.
             */
            inputSurface =
                encoder.createInputSurface()

            codec =
                encoder

            encoder.start()

            running.set(true)

            startDrainThread()

            return inputSurface!!

        } catch (
            exception: Exception
        ) {

            cleanupCodec()

            onError(
                exception
            )

            throw exception
        }
    }

    // ---------------------------------------------------------
    // OUTPUT DRAINING
    // ---------------------------------------------------------

    private fun startDrainThread() {

        drainThread =
            Thread(
                {
                    drainLoop()
                },
                "PhoneCast-H264-Drain"
            ).apply {

                isDaemon = true

                start()
            }
    }

    private fun drainLoop() {

        val encoder =
            codec ?: return

        try {

            while (
                running.get()
            ) {

                val outputIndex =
                    encoder.dequeueOutputBuffer(
                        bufferInfo,
                        10_000L
                    )

                when {

                    outputIndex ==
                        MediaCodec.INFO_TRY_AGAIN_LATER -> {

                        /*
                         * No output currently available.
                         * Continue waiting.
                         */
                    }

                    outputIndex ==
                        MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {

                        val outputFormat =
                            encoder.outputFormat

                        onOutputFormat(
                            outputFormat
                        )
                    }

                    outputIndex >= 0 -> {

                        processOutputBuffer(
                            encoder,
                            outputIndex
                        )
                    }
                }
            }

        } catch (
            exception: Exception
        ) {

            if (
                running.get()
            ) {

                onError(
                    exception
                )
            }
        }
    }

    // ---------------------------------------------------------
    // OUTPUT BUFFER
    // ---------------------------------------------------------

    private fun processOutputBuffer(
        encoder: MediaCodec,
        outputIndex: Int
    ) {

        try {

            val outputBuffer =
                encoder.getOutputBuffer(
                    outputIndex
                )

            if (
                outputBuffer != null &&
                bufferInfo.size > 0
            ) {

                val offset =
                    bufferInfo.offset

                val size =
                    bufferInfo.size

                val data =
                    ByteArray(size)

                outputBuffer.position(
                    offset
                )

                outputBuffer.limit(
                    offset + size
                )

                outputBuffer.get(
                    data
                )

                onEncodedFrame(
                    data,
                    0,
                    data.size,
                    bufferInfo.presentationTimeUs,
                    bufferInfo.flags
                )
            }

        } finally {

            encoder.releaseOutputBuffer(
                outputIndex,
                false
            )
        }
    }

    // ---------------------------------------------------------
    // REQUEST KEY FRAME
    // ---------------------------------------------------------

    fun requestKeyFrame() {

        val encoder =
            codec ?: return

        if (!running.get()) {
            return
        }

        try {

            val params =
                android.os.Bundle().apply {

                    putInt(
                        MediaCodec.PARAMETER_KEY_REQUEST_SYNC_FRAME,
                        0
                    )
                }

            encoder.setParameters(
                params
            )

        } catch (
            exception: Exception
        ) {

            onError(
                exception
            )
        }
    }

    // ---------------------------------------------------------
    // STOP
    // ---------------------------------------------------------

    fun stop() {

        if (
            !running.getAndSet(false)
        ) {
            return
        }

        try {

            drainThread?.interrupt()

        } catch (_: Exception) {
        }

        drainThread =
            null

        cleanupCodec()
    }

    // ---------------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------------

    private fun cleanupCodec() {

        inputSurface?.let {

            try {
                it.release()
            } catch (_: Exception) {
            }
        }

        inputSurface =
            null

        codec?.let {

            try {
                it.stop()
            } catch (_: Exception) {
            }

            try {
                it.release()
            } catch (_: Exception) {
            }
        }

        codec =
            null
    }
}