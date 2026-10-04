"use strict";


export const state = {

    currentPage:
        "welcome",

    account:
        null,

    devices:
        [],

    selectedDevice:
        null,

    connectionHistory:
        [],

    searching:
        false,

    connecting:
        false,

    connectionStatus:
        "Ready",

    activeRequestId:
        null,

    video: {

        active:
            false,

        connected:
            false,

        ready:
            false,

        configured:
            false,

        decoder:
            null,

        canvas:
            null,

        context:
            null,

        width:
            0,

        height:
            0,

        fps:
            60,

        bitrate:
            0,

        codec:
            "H.264",

        codecString:
            null,

        description:
            null,

        frameCount:
            0,

        pendingFrames:
            0,

        lastTimestamp:
            0,

        lastFrameAt:
            0,

        decoderError:
            null,

        pendingCodecHeader:
            null
    }
};