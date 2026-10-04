"use strict";


import {
    state
} from "../state/appState.js";


import {
    toUint8Array,
    readBE32,
    normalizeTimestamp
} from "../ui/helpers.js";


let viewerReady =
    false;


export function initializeVideoViewer() {

    const canvas =
        document.getElementById(
            "phoneCastVideoCanvas"
        );


    if (!canvas) {

        console.error(
            "[PhoneCast Video] Canvas not found."
        );

        return;
    }


    state.video.canvas =
        canvas;


    state.video.context =
        canvas.getContext(
            "2d",
            {
                alpha:
                    false,

                desynchronized:
                    true
            }
        );


    viewerReady =
        true;


    if (
        state.video.width &&
        state.video.height
    ) {

        resizeCanvas(
            state.video.width,
            state.video.height
        );
    }


    /*
     * The codec header may have arrived before
     * the casting page was created.
     */

    if (
        state.video.pendingCodecHeader
    ) {

        const header =
            state.video.pendingCodecHeader;

        state.video.pendingCodecHeader =
            null;

        configureH264(
            header
        );
    }
}


export function handleVideoEvent(
    event
) {

    if (
        !event ||
        typeof event !==
        "object"
    ) {

        return;
    }


    console.log(
        "[PhoneCast Video Event]",
        event
    );


    const type =
        String(
            event.type ||
            ""
        ).toUpperCase();


    if (
        type ===
            "VIDEO_SOCKET_CONNECTED" ||
        type ===
            "VIDEO_CONNECTED"
    ) {

        state.video.connected =
            true;

        setViewerStatus(
            "Video connection established..."
        );

        return;
    }


    if (
        type ===
            "CODEC_HEADER" ||
        type ===
            "VIDEO_CODEC_HEADER" ||
        type ===
            "CODEC_FORMAT" ||
        event.csd0 ||
        event.csd1
    ) {

        state.video.pendingCodecHeader =
            event;


        if (
            viewerReady
        ) {

            const header =
                state.video.pendingCodecHeader;

            state.video.pendingCodecHeader =
                null;

            configureH264(
                header
            );
        }

        return;
    }


    if (
        type ===
            "VIDEO_SOCKET_CLOSED" ||
        type ===
            "VIDEO_STREAM_STOPPED"
    ) {

        state.video.connected =
            false;

        setViewerStatus(
            "Video stream stopped."
        );

        return;
    }


    if (
        type ===
            "VIDEO_ERROR" ||
        type ===
            "VIDEO_SOCKET_ERROR" ||
        type ===
            "ERROR"
    ) {

        state.video.decoderError =
            event.message ||
            "Video stream error.";


        setViewerStatus(
            state.video.decoderError
        );


        showViewerEmpty(
            true
        );
    }
}


export async function configureH264(
    header
) {

    try {

        if (
            !window.VideoDecoder ||
            !window.EncodedVideoChunk
        ) {

            throw new Error(
                "WebCodecs VideoDecoder is unavailable."
            );
        }


        const csd0 =
            toUint8Array(
                header.csd0
            );


        const csd1 =
            toUint8Array(
                header.csd1
            );


        if (
            !csd0 ||
            !csd1 ||
            !csd0.length ||
            !csd1.length
        ) {

            throw new Error(
                "Phone did not send H.264 SPS/PPS."
            );
        }


        state.video.width =
            Number(
                header.width
            ) ||
            1080;


        state.video.height =
            Number(
                header.height
            ) ||
            2400;


        state.video.fps =
            Number(
                header.frameRate ||
                header.fps
            ) ||
            60;


        state.video.bitrate =
            Number(
                header.bitrate
            ) ||
            12000000;


        state.video.codec =
            "H.264";


        const sps =
            extractNal(
                csd0,
                7
            );


        const pps =
            extractNal(
                csd1,
                8
            );


        if (
            !sps ||
            !pps
        ) {

            throw new Error(
                "Invalid H.264 SPS/PPS."
            );
        }


        const description =
            buildAvcDescription(
                sps,
                pps
            );


        const codec =
            buildCodecString(
                sps
            );


        closeDecoder(
            false
        );


        const config = {

            codec,

            codedWidth:
                state.video.width,

            codedHeight:
                state.video.height,

            description:
                description.buffer,

            optimizeForLatency:
                true,

            hardwareAcceleration:
                "prefer-hardware"
        };


        if (
            typeof VideoDecoder
                .isConfigSupported ===
            "function"
        ) {

            const support =
                await VideoDecoder
                    .isConfigSupported(
                        config
                    );


            if (
                !support?.supported
            ) {

                throw new Error(
                    `H.264 configuration is not supported: ${codec}`
                );
            }
        }


        const decoder =
            new VideoDecoder({

                output:
                    renderDecodedFrame,

                error:
                    error => {

                        console.error(
                            "[PhoneCast Video] Decoder error:",
                            error
                        );


                        state.video.decoderError =
                            error?.message ||
                            String(error);


                        state.video.configured =
                            false;


                        setViewerStatus(
                            "H.264 decoder error"
                        );


                        showViewerEmpty(
                            true
                        );
                    }
            });


        decoder.configure(
            config
        );


        state.video.decoder =
            decoder;

        state.video.configured =
            true;

        state.video.ready =
            true;

        state.video.codecString =
            codec;

        state.video.description =
            description;

        state.video.frameCount =
            0;

        state.video.pendingFrames =
            0;

        state.video.lastTimestamp =
            0;

        state.video.decoderError =
            null;


        resizeCanvas(
            state.video.width,
            state.video.height
        );


        updateMetadata();


        showViewerLoading(
            true
        );


        showViewerEmpty(
            false
        );


        setViewerStatus(
            `${state.video.width} × ${state.video.height} • H.264 • Decoder ready`
        );


        console.log(
            "[PhoneCast Video] H.264 decoder READY",
            codec
        );

    } catch (error) {

        console.error(
            "[PhoneCast Video] H.264 setup failed:",
            error
        );


        state.video.configured =
            false;

        state.video.ready =
            false;


        setViewerStatus(
            error.message ||
            "Unable to configure H.264."
        );


        showViewerLoading(
            false
        );


        showViewerEmpty(
            true
        );
    }
}


export function handleVideoFrame(
    packet
) {

    const decoder =
        state.video.decoder;


    if (
        !decoder ||
        !state.video.configured
    ) {

        return;
    }


    try {

        const data =
            toUint8Array(
                packet?.data
            );


        if (
            !data ||
            !data.length
        ) {

            return;
        }


        /*
         * Drop frames when the decoder queue
         * becomes too large.
         *
         * The encoder sends regular keyframes,
         * so the stream will recover naturally.
         */

        if (
            decoder.decodeQueueSize >=
            6
        ) {

            return;
        }


        const flags =
            Number(
                packet.flags ||
                0
            );


        const keyFrame =
            (
                flags &
                1
            ) !== 0 ||
            detectKeyFrame(
                data
            );


        const timestamp =
            normalizeTimestamp(
                packet.presentationTimeUs,
                state.video.lastTimestamp +
                Math.round(
                    1000000 /
                    (
                        state.video.fps ||
                        60
                    )
                )
            );


        const avcc =
            convertToAvcc(
                data
            );


        if (
            !avcc ||
            !avcc.length
        ) {

            return;
        }


        const chunk =
            new EncodedVideoChunk({

                type:
                    keyFrame
                        ? "key"
                        : "delta",

                timestamp,

                data:
                    avcc
            });


        state.video.pendingFrames +=
            1;


        state.video.lastTimestamp =
            timestamp;


        decoder.decode(
            chunk
        );

    } catch (error) {

        state.video.pendingFrames =
            Math.max(
                0,
                state.video.pendingFrames -
                1
            );


        console.error(
            "[PhoneCast Video] Frame decode failed:",
            error
        );
    }
}


function renderDecodedFrame(
    frame
) {

    try {

        const canvas =
            state.video.canvas;

        const context =
            state.video.context;


        if (
            !canvas ||
            !context
        ) {

            return;
        }


        const width =
            frame.displayWidth ||
            frame.codedWidth ||
            state.video.width;


        const height =
            frame.displayHeight ||
            frame.codedHeight ||
            state.video.height;


        if (
            canvas.width !== width ||
            canvas.height !== height
        ) {

            canvas.width =
                width;

            canvas.height =
                height;
        }


        context.drawImage(
            frame,
            0,
            0,
            width,
            height
        );


        state.video.frameCount +=
            1;


        state.video.lastFrameAt =
            performance.now();


        state.video.pendingFrames =
            Math.max(
                0,
                state.video.pendingFrames -
                1
            );


        if (
            state.video.frameCount ===
            1
        ) {

            showViewerLoading(
                false
            );

            showViewerEmpty(
                false
            );


            setViewerStatus(
                `${width} × ${height} • H.264 • LIVE`
            );


            console.log(
                "[PhoneCast Video] FIRST FRAME RENDERED"
            );
        }

    } catch (error) {

        console.error(
            "[PhoneCast Video] Canvas render failed:",
            error
        );

    } finally {

        try {

            frame.close();

        } catch (_) {
        }
    }
}


export function closeDecoder(
    resetState = true
) {

    const decoder =
        state.video.decoder;


    state.video.decoder =
        null;

    state.video.configured =
        false;

    state.video.ready =
        false;

    state.video.description =
        null;

    state.video.codecString =
        null;

    state.video.pendingFrames =
        0;


    if (decoder) {

        try {

            if (
                decoder.state !==
                "closed"
            ) {

                decoder.close();
            }

        } catch (error) {

            console.warn(
                "[PhoneCast Video] Decoder close failed:",
                error
            );
        }
    }


    if (
        resetState
    ) {

        state.video.active =
            false;

        state.video.connected =
            false;

        state.video.width =
            0;

        state.video.height =
            0;

        state.video.frameCount =
            0;

        state.video.lastTimestamp =
            0;

        state.video.decoderError =
            null;

        state.video.pendingCodecHeader =
            null;
    }
}


function extractNal(
    data,
    type
) {

    const bytes =
        toUint8Array(
            data
        );


    if (
        !bytes
    ) {

        return null;
    }


    const annex =
        splitAnnexB(
            bytes
        );


    for (
        const nal of annex
    ) {

        if (
            nal.length &&
            (
                nal[0] &
                0x1f
            ) ===
            type
        ) {

            return nal;
        }
    }


    if (
        bytes.length &&
        (
            bytes[0] &
            0x1f
        ) ===
        type
    ) {

        return bytes;
    }


    let offset =
        0;


    while (
        offset + 4 <=
        bytes.length
    ) {

        const length =
            readBE32(
                bytes,
                offset
            );


        offset += 4;


        if (
            length <= 0 ||
            offset + length >
            bytes.length
        ) {

            break;
        }


        const nal =
            bytes.subarray(
                offset,
                offset + length
            );


        if (
            nal.length &&
            (
                nal[0] &
                0x1f
            ) ===
            type
        ) {

            return nal;
        }


        offset +=
            length;
    }


    return null;
}


function splitAnnexB(
    data
) {

    const result = [];

    let start =
        -1;


    for (
        let i = 0;
        i < data.length - 3;
        i++
    ) {

        let prefix =
            0;


        if (
            data[i] === 0 &&
            data[i + 1] === 0 &&
            data[i + 2] === 1
        ) {

            prefix =
                3;

        } else if (
            data[i] === 0 &&
            data[i + 1] === 0 &&
            data[i + 2] === 0 &&
            data[i + 3] === 1
        ) {

            prefix =
                4;
        }


        if (
            prefix
        ) {

            if (
                start >= 0 &&
                i > start
            ) {

                result.push(
                    data.subarray(
                        start,
                        i
                    )
                );
            }


            start =
                i +
                prefix;


            i +=
                prefix -
                1;
        }
    }


    if (
        start >= 0 &&
        start < data.length
    ) {

        result.push(
            data.subarray(
                start
            )
        );
    }


    return result.filter(
        nal =>
            nal.length
    );
}


function convertToAvcc(
    data
) {

    const bytes =
        toUint8Array(
            data
        );


    if (
        !bytes ||
        !bytes.length
    ) {

        return null;
    }


    const nals =
        splitAnnexB(
            bytes
        );


    if (
        nals.length
    ) {

        return nalsToAvcc(
            nals
        );
    }


    if (
        isAvcc(
            bytes
        )
    ) {

        return bytes;
    }


    return nalsToAvcc(
        [bytes]
    );
}


function nalsToAvcc(
    nals
) {

    const size =
        nals.reduce(
            (
                total,
                nal
            ) =>
                total +
                4 +
                nal.length,
            0
        );


    const output =
        new Uint8Array(
            size
        );


    const view =
        new DataView(
            output.buffer
        );


    let offset =
        0;


    for (
        const nal of nals
    ) {

        view.setUint32(
            offset,
            nal.length,
            false
        );


        offset +=
            4;


        output.set(
            nal,
            offset
        );


        offset +=
            nal.length;
    }


    return output;
}


function isAvcc(
    data
) {

    let offset =
        0;

    let count =
        0;


    while (
        offset + 4 <=
        data.length
    ) {

        const length =
            readBE32(
                data,
                offset
            );


        offset +=
            4;


        if (
            length <= 0 ||
            offset + length >
            data.length
        ) {

            return false;
        }


        const type =
            data[offset] &
            0x1f;


        if (
            type < 1 ||
            type > 31
        ) {

            return false;
        }


        offset +=
            length;


        count +=
            1;
    }


    return (
        count > 0 &&
        offset ===
        data.length
    );
}


function detectKeyFrame(
    data
) {

    const nals =
        splitAnnexB(
            data
        );


    if (
        nals.length
    ) {

        return nals.some(
            nal =>
                (
                    nal[0] &
                    0x1f
                ) ===
                5
        );
    }


    if (
        isAvcc(
            data
        )
    ) {

        let offset =
            0;


        while (
            offset + 4 <=
            data.length
        ) {

            const length =
                readBE32(
                    data,
                    offset
                );


            offset += 4;


            if (
                offset + length >
                data.length
            ) {

                break;
            }


            if (
                (
                    data[offset] &
                    0x1f
                ) === 5
            ) {

                return true;
            }


            offset +=
                length;
        }
    }


    return (
        (
            data[0] &
            0x1f
        ) === 5
    );
}


function buildAvcDescription(
    sps,
    pps
) {

    const output =
        new Uint8Array(
            11 +
            sps.length +
            pps.length
        );


    let offset =
        0;


    output[offset++] =
        1;


    output[offset++] =
        sps[1] ||
        0x42;


    output[offset++] =
        sps[2] ||
        0x00;


    output[offset++] =
        sps[3] ||
        0x1f;


    output[offset++] =
        0xff;


    output[offset++] =
        0xe1;


    output[offset++] =
        (sps.length >> 8) &
        0xff;


    output[offset++] =
        sps.length &
        0xff;


    output.set(
        sps,
        offset
    );


    offset +=
        sps.length;


    output[offset++] =
        1;


    output[offset++] =
        (pps.length >> 8) &
        0xff;


    output[offset++] =
        pps.length &
        0xff;


    output.set(
        pps,
        offset
    );


    return output;
}


function buildCodecString(
    sps
) {

    return (
        "avc1." +

        toHex(
            sps[1] ||
            0x42
        ) +

        toHex(
            sps[2] ||
            0x00
        ) +

        toHex(
            sps[3] ||
            0x1f
        )
    );
}


function toHex(
    value
) {

    return Number(
        value &
        0xff
    )
        .toString(16)
        .padStart(
            2,
            "0"
        )
        .toUpperCase();
}


function resizeCanvas(
    width,
    height
) {

    const canvas =
        state.video.canvas;


    if (
        !canvas ||
        !width ||
        !height
    ) {

        return;
    }


    canvas.width =
        width;

    canvas.height =
        height;


    canvas.style.display =
        "block";

    canvas.classList.add(
        "phone-cast-video-active"
    );
}


function setViewerStatus(
    message
) {

    const element =
        document.getElementById(
            "phoneCastViewerStatus"
        );


    if (element) {

        element.textContent =
            message;
    }
}


function showViewerLoading(
    visible
) {

    const element =
        document.getElementById(
            "phoneCastViewerLoading"
        );


    if (element) {

        element.style.display =
            visible
                ? "flex"
                : "none";
    }
}


function showViewerEmpty(
    visible
) {

    const element =
        document.getElementById(
            "phoneCastViewerEmpty"
        );


    if (element) {

        element.style.display =
            visible
                ? "flex"
                : "none";
    }
}


function updateMetadata() {

    const resolution =
        document.getElementById(
            "phoneCastResolution"
        );


    const fps =
        document.getElementById(
            "phoneCastFps"
        );


    const codec =
        document.getElementById(
            "phoneCastCodec"
        );


    if (resolution) {

        resolution.textContent =
            state.video.width &&
            state.video.height

                ? `${state.video.width} × ${state.video.height}`

                : "Waiting...";
    }


    if (fps) {

        fps.textContent =
            `${Math.round(
                state.video.fps ||
                60
            )} FPS`;
    }


    if (codec) {

        codec.textContent =
            state.video.codec ||
            "H.264";
    }
}


export function resetViewer() {

    viewerReady =
        false;

    closeDecoder();


    state.video.canvas =
        null;

    state.video.context =
        null;
}