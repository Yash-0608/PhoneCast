"use strict";

import {
    state
} from "../state/appState.js";

import {
    navigate
} from "./navigation.js";

import {
    refreshHistory
} from "../connection/connection.js";

import {
    handleVideoEvent,
    handleVideoFrame,
    closeDecoder
} from "../video/video.js";

// ============================================================
// PHONECAST EVENT SYSTEM
// ============================================================

let listenersRegistered = false;

let discoveryTimer = null;

let discoveryRetryTimer = null;

let discoveryGeneration = 0;

const DISCOVERY_TIMEOUT = 12000;

const DISCOVERY_RETRY_DELAY = 1000;


// ============================================================
// SMALL HELPERS
// ============================================================

function safeNumber(
    value,
    fallback = 0
) {
    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}


function safeString(
    value,
    fallback = ""
) {
    if (
        value === null ||
        value === undefined
    ) {
        return fallback;
    }

    return String(value);
}


function clearDiscoveryTimers() {

    if (
        discoveryTimer !== null
    ) {
        clearTimeout(
            discoveryTimer
        );

        discoveryTimer =
            null;
    }


    if (
        discoveryRetryTimer !== null
    ) {
        clearTimeout(
            discoveryRetryTimer
        );

        discoveryRetryTimer =
            null;
    }
}


// ============================================================
// DISCOVERY FINISH
// ============================================================

function finishDiscovery(
    reason = "complete"
) {

    clearDiscoveryTimers();

    state.searching =
        false;

    console.log(
        "[PhoneCast Discovery] Search finished:",
        reason
    );


    if (
        state.currentPage ===
        "home"
    ) {
        navigate(
            "home"
        );
    }
}


// ============================================================
// DISCOVERY WATCHDOG
// ============================================================

function startDiscoveryWatchdog(
    generation
) {

    clearDiscoveryTimers();


    discoveryTimer =
        setTimeout(
            () => {

                /*
                 * Ignore an old timer if a newer
                 * discovery session has started.
                 */

                if (
                    generation !==
                    discoveryGeneration
                ) {
                    return;
                }


                if (
                    !state.searching
                ) {
                    return;
                }


                console.log(
                    "[PhoneCast Discovery] Search timeout reached."
                );


                finishDiscovery(
                    "timeout"
                );

            },
            DISCOVERY_TIMEOUT
        );
}


// ============================================================
// BEGIN DEVICE DISCOVERY
// ============================================================

export async function beginDeviceDiscovery() {

    if (
        !window.phoneCast
    ) {

        console.error(
            "[PhoneCast Discovery] preload API unavailable."
        );

        state.searching =
            false;

        state.connectionStatus =
            "PhoneCast API unavailable.";

        updateStatusElement();

        return false;
    }


    if (
        typeof window.phoneCast
            .searchDevices !==
        "function"
    ) {

        console.error(
            "[PhoneCast Discovery] searchDevices() is unavailable."
        );

        state.searching =
            false;

        state.connectionStatus =
            "Device search is unavailable.";

        updateStatusElement();

        return false;
    }


    discoveryGeneration +=
        1;

    const generation =
        discoveryGeneration;


    clearDiscoveryTimers();


    state.searching =
        true;

    state.connectionStatus =
        "Searching for devices...";


    console.log(
        "[PhoneCast Discovery] Starting discovery session:",
        generation
    );


    updateStatusElement();


    startDiscoveryWatchdog(
        generation
    );


    try {

        const result =
            await window.phoneCast
                .searchDevices();


        /*
         * The main process may return immediately
         * while Bonjour continues searching.
         *
         * Therefore, a successful IPC call does NOT
         * mean that discovery has finished.
         */

        console.log(
            "[PhoneCast Discovery] searchDevices() result:",
            result
        );


        return true;

    } catch (
        error
    ) {

        console.error(
            "[PhoneCast Discovery] searchDevices() failed:",
            error
        );


        if (
            generation ===
            discoveryGeneration
        ) {

            clearDiscoveryTimers();

            state.searching =
                false;

            state.connectionStatus =
                error?.message ||
                "Device search failed.";

            updateStatusElement();


            if (
                state.currentPage ===
                "home"
            ) {
                navigate(
                    "home"
                );
            }
        }


        return false;
    }
}


// ============================================================
// SETUP EVENT LISTENERS
// ============================================================

export function setupEventListeners() {

    console.log(
        "[PhoneCast Events] Setting up event listeners..."
    );


    if (
        !window.phoneCast
    ) {

        console.error(
            "[PhoneCast Events] preload API unavailable."
        );

        return false;
    }


    if (
        listenersRegistered
    ) {

        console.warn(
            "[PhoneCast Events] Event listeners already registered."
        );

        return true;
    }


    listenersRegistered =
        true;


    // ========================================================
    // DEVICE DISCOVERY
    // ========================================================

    if (
        typeof window.phoneCast
            .onDevicesUpdated ===
        "function"
    ) {

        console.log(
            "[PhoneCast Events] Registering devices-updated listener."
        );


        window.phoneCast
            .onDevicesUpdated(
                devices => {

                    const normalizedDevices =
                        Array.isArray(
                            devices
                        )
                            ? devices
                            : [];


                    state.devices =
                        normalizedDevices;


                    console.log(
                        "[PhoneCast Discovery] devices-updated RECEIVED:",
                        normalizedDevices
                    );


                    console.log(
                        "[PhoneCast Discovery] Devices found:",
                        normalizedDevices.length
                    );


                    /*
                     * IMPORTANT:
                     *
                     * main.js sends an empty device list
                     * immediately when discovery starts.
                     *
                     * An empty list therefore does NOT mean
                     * discovery has finished.
                     */

                    if (
                        normalizedDevices.length ===
                        0 &&
                        !state.searching
                    ) {

                        /*
                         * If we were not actively searching,
                         * simply refresh the current page.
                         */

                        if (
                            state.currentPage ===
                            "home"
                        ) {
                            navigate(
                                "home"
                            );
                        }

                    } else {

                        console.log(
                            "[PhoneCast Discovery] Empty discovery update received. Continuing search..."
                        );

                        updateStatusElement();
                    }
                }
            );

    } else {

        console.error(
            "[PhoneCast Events] onDevicesUpdated() is missing from preload API."
        );
    }


    // ========================================================
    // CONNECTION EVENTS
    // ========================================================

    if (
        typeof window.phoneCast
            .onConnectionEvent ===
        "function"
    ) {

        console.log(
            "[PhoneCast Events] Registering connection-event listener."
        );


        window.phoneCast
            .onConnectionEvent(
                event => {

                    console.log(
                        "[PhoneCast Events] connection-event RECEIVED:",
                        event
                    );


                    handleConnectionEvent(
                        event
                    );
                }
            );

    } else {

        console.error(
            "[PhoneCast Events] onConnectionEvent() is missing from preload API."
        );
    }


    // ========================================================
    // VIDEO EVENTS
    // ========================================================

    if (
        typeof window.phoneCast
            .onVideoEvent ===
        "function"
    ) {

        console.log(
            "[PhoneCast Events] Registering video-event listener."
        );


        window.phoneCast
            .onVideoEvent(
                event => {

                    try {

                        handleVideoEvent(
                            event
                        );

                    } catch (
                        error
                    ) {

                        console.error(
                            "[PhoneCast Video] Video event error:",
                            error
                        );

                        state.video.decoderError =
                            error?.message ||
                            "Video event error.";

                        updateStatusElement();
                    }
                }
            );

    } else {

        console.warn(
            "[PhoneCast Events] onVideoEvent() unavailable."
        );
    }


    // ========================================================
    // VIDEO FRAMES
    // ========================================================

    if (
        typeof window.phoneCast
            .onVideoFrame ===
        "function"
    ) {

        console.log(
            "[PhoneCast Events] Registering video-frame listener."
        );


        window.phoneCast
            .onVideoFrame(
                frame => {

                    try {

                        handleVideoFrame(
                            frame
                        );

                    } catch (
                        error
                    ) {

                        console.error(
                            "[PhoneCast Video] Video frame error:",
                            error
                        );
                    }
                }
            );

    } else {

        console.warn(
            "[PhoneCast Events] onVideoFrame() unavailable."
        );
    }


    // ========================================================
    // HISTORY EVENTS
    // ========================================================

    if (
        typeof window.phoneCast
            .onHistoryUpdated ===
        "function"
    ) {

        console.log(
            "[PhoneCast Events] Registering history listener."
        );


        window.phoneCast
            .onHistoryUpdated(
                history => {

                    state.connectionHistory =
                        Array.isArray(
                            history
                        )
                            ? history
                            : [];


                    console.log(
                        "[PhoneCast Events] History updated:",
                        state.connectionHistory.length
                    );


                    updateStatusElement();
                }
            );

    } else {

        console.log(
            "[PhoneCast Events] onHistoryUpdated() is not exposed by preload. Using refreshHistory() when required."
        );
    }


    console.log(
        "[PhoneCast Events] All available event listeners registered."
    );


    return true;
}


// ============================================================
// CONNECTION EVENT HANDLER
// ============================================================

export function handleConnectionEvent(
    event
) {

    if (
        !event ||
        typeof event !==
        "object"
    ) {

        console.warn(
            "[PhoneCast Connection] Invalid connection event:",
            event
        );

        return;
    }


    console.log(
        "[PhoneCast Connection]",
        event
    );


    const eventType =
        safeString(
            event.type
        )
            .trim()
            .toUpperCase();


    console.log(
        "[PhoneCast Connection] Event type:",
        eventType
    );

    switch (
        eventType
    ) {

        // ====================================================
        // REQUEST SENT
        // ====================================================

        case "REQUEST_SENT":

            state.connecting =
                true;

            state.activeRequestId =
                event.requestId ||
                null;

            state.connectionStatus =
                "Request sent. Waiting for phone approval...";

            break;


        case "CONTROL_MESSAGE_RECEIVED":

            console.log(
                "[PhoneCast] Control message reached laptop:",
                event.messageType
            );

            break;


        // ====================================================
        // REQUEST ACCEPTED
        // ====================================================

        case "REQUEST_ACCEPTED":

            state.connecting =
                true;

            state.connectionStatus =
                "Phone accepted. Waiting for authentication...";

            break;


        // ====================================================
        // AUTHENTICATION REQUIRED
        // ====================================================

        case "AUTHENTICATION_REQUIRED":

            state.connecting =
                true;

            state.connectionStatus =
                "Waiting for phone authentication...";

            break;


        // ====================================================
        // AUTHENTICATION SUCCESS
        // ====================================================

        case "AUTHENTICATION_SUCCESS":

            state.connecting =
                true;

            state.connectionStatus =
                "Phone authenticated. Preparing screen capture...";

            break;


        case "REMOTE_CONTROL_UNAVAILABLE":

            state.connectionStatus =
                "Remote control is unavailable. Enable PhoneCast Accessibility access on the phone.";

            console.warn(
                "[PhoneCast] Remote control unavailable:",
                event.reason
            );

            break;


        // ====================================================
        // SCREEN CAPTURE READY
        // ====================================================

        case "SCREEN_CAPTURE_READY":

        case "SCREEN_SHARE_READY":

            state.connecting =
                true;

            state.connectionStatus =
                "Screen capture ready. Opening video stream...";

            break;


        // ====================================================
        // SCREEN CAPTURE STARTED
        // ====================================================

        case "SCREEN_CAPTURE_STARTED":

            state.connecting =
                true;

            state.connectionStatus =
                "Screen capture started.";

            break;


        // ====================================================
        // SCREEN CAPTURE FAILED
        // ====================================================

        case "SCREEN_CAPTURE_FAILED":

            resetConnectionState();

            state.connectionStatus =
                safeString(
                    event.message,
                    "Screen capture failed."
                );

            refreshHistorySafely();

            break;


        // ====================================================
        // VIDEO STREAM READY
        // ====================================================

        case "VIDEO_STREAM_READY":

            state.video.active =
                true;

            state.video.connected =
                true;

            state.video.ready =
                false;

            state.video.decoderError =
                null;

            state.video.width =
                safeNumber(
                    event.width,
                    1080
                );

            state.video.height =
                safeNumber(
                    event.height,
                    2400
                );

            state.video.fps =
                safeNumber(
                    event.fps,
                    60
                );

            state.video.bitrate =
                safeNumber(
                    event.bitrate,
                    12000000
                );

            state.video.codec =
                safeString(
                    event.codec,
                    "H.264"
                );

            state.video.codecString =
                event.codecString ||
                null;

            state.video.description =
                event.description ||
                null;

            state.connectionStatus =
                "Video stream ready.";


            console.log(
                "[PhoneCast] Video stream ready:",
                {
                    width:
                        state.video.width,

                    height:
                        state.video.height,

                    fps:
                        state.video.fps,

                    bitrate:
                        state.video.bitrate,

                    codec:
                        state.video.codec
                }
            );


            /*
             * The casting page is opened only after
             * the video stream has been prepared.
             */

            navigate(
                "casting"
            );

            break;


        // ====================================================
        // VIDEO STREAM STOPPED
        // ====================================================

        case "VIDEO_STREAM_STOPPED":

            stopVideoState();

            state.connecting =
                false;

            state.activeRequestId =
                null;

            state.connectionStatus =
                safeString(
                    event.message,
                    "Video stream stopped."
                );

            refreshHistorySafely();


            if (
                state.currentPage ===
                "casting"
            ) {

                navigate(
                    "home"
                );
            }

            break;


        // ====================================================
        // REQUEST REJECTED
        // ====================================================

        case "REQUEST_REJECTED":

            stopVideoState();

            state.connecting =
                false;

            state.activeRequestId =
                null;

            state.connectionStatus =
                safeString(
                    event.reason ||
                    event.message,
                    "Connection request was rejected."
                );

            refreshHistorySafely();

            break;


        // ====================================================
        // CONNECTION ERROR
        // ====================================================

        case "CONNECTION_ERROR":

            stopVideoState();

            state.connecting =
                false;

            state.activeRequestId =
                null;

            state.connectionStatus =
                safeString(
                    event.message,
                    "Connection error."
                );

            refreshHistorySafely();

            break;


        // ====================================================
        // CONNECTION CLOSED
        // ====================================================

        case "CONNECTION_CLOSED":

            stopVideoState();

            state.connecting =
                false;

            state.activeRequestId =
                null;

            state.connectionStatus =
                safeString(
                    event.message,
                    "Connection closed."
                );

            refreshHistorySafely();


            if (
                state.currentPage ===
                "casting"
            ) {

                navigate(
                    "home"
                );
            }

            break;


        // ====================================================
        // UNKNOWN EVENT
        // ====================================================

        default:

            console.log(
                "[PhoneCast Connection] Unhandled connection event:",
                event
            );

            break;
    }


    updateStatusElement();
}


// ============================================================
// RESET CONNECTION STATE
// ============================================================

function resetConnectionState() {

    state.connecting =
        false;

    state.activeRequestId =
        null;

    stopVideoState(
        false
    );
}


// ============================================================
// STOP VIDEO STATE
// ============================================================

function stopVideoState(
    closeVideoDecoder = true
) {

    if (
        closeVideoDecoder
    ) {

        try {

            closeDecoder();

        } catch (
            error
        ) {

            console.warn(
                "[PhoneCast Video] Failed to close decoder:",
                error
            );
        }
    }


    state.video.active =
        false;

    state.video.connected =
        false;

    state.video.ready =
        false;

    state.video.configured =
        false;

    state.video.width =
        0;

    state.video.height =
        0;

    state.video.fps =
        60;

    state.video.bitrate =
        0;

    state.video.frameCount =
        0;

    state.video.pendingFrames =
        0;

    state.video.lastTimestamp =
        0;

    state.video.lastFrameAt =
        0;

    state.video.decoderError =
        null;

    state.video.pendingCodecHeader =
        null;
}


// ============================================================
// SAFE HISTORY REFRESH
// ============================================================

function refreshHistorySafely() {

    if (
        typeof refreshHistory !==
        "function"
    ) {

        return;
    }


    try {

        const result =
            refreshHistory();


        /*
         * If refreshHistory() returns a Promise,
         * handle rejection without creating an
         * unhandled Promise rejection.
         */

        if (
            result &&
            typeof result.catch ===
            "function"
        ) {

            result.catch(
                error => {

                    console.warn(
                        "[PhoneCast History] Failed to refresh history:",
                        error
                    );
                }
            );
        }

    } catch (
        error
    ) {

        console.warn(
            "[PhoneCast History] Failed to refresh history:",
            error
        );
    }
}


// ============================================================
// UPDATE CONNECTION STATUS
// ============================================================

export function updateStatusElement() {

    const element =
        document.getElementById(
            "connectionStatus"
        );


    if (
        !element
    ) {

        return;
    }


    element.textContent =
        safeString(
            state.connectionStatus,
            ""
        );
}


// ============================================================
// CLEANUP
// ============================================================

export function cleanupEventListeners() {

    clearDiscoveryTimers();


    discoveryGeneration +=
        1;


    if (
        window.phoneCast &&
        typeof window.phoneCast
            .removeAllListeners ===
        "function"
    ) {

        try {

            window.phoneCast
                .removeAllListeners(
                    "devices-updated"
                );

            window.phoneCast
                .removeAllListeners(
                    "connection-event"
                );

            window.phoneCast
                .removeAllListeners(
                    "video-event"
                );

            window.phoneCast
                .removeAllListeners(
                    "video-frame"
                );

        } catch (
            error
        ) {

            console.warn(
                "[PhoneCast Events] Listener cleanup failed:",
                error
            );
        }
    }


    listenersRegistered =
        false;


    console.log(
        "[PhoneCast Events] Event listeners cleaned up."
    );
}