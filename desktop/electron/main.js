const {
    app,
    BrowserWindow,
    ipcMain
} = require("electron");

const path = require("path");
const net = require("net");
const os = require("os");
const { Bonjour } = require("bonjour-service");

let mainWindow = null;

let bonjour = null;
let browser = null;

const discoveredDevices = new Map();

let discoveryTimer = null;

function getDiscoveryInterface() {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    for (const [name, entries] of Object.entries(interfaces)) {
        for (const entry of entries || []) {
            if (
                entry.family !== "IPv4" ||
                entry.internal ||
                !entry.address ||
                entry.mac === "00:00:00:00:00:00"
            ) {
                continue;
            }

            const isPrivateLan =
                entry.address.startsWith("10.") ||
                entry.address.startsWith("192.168.") ||
                /^172\.(1[6-9]|2\d|3[01])\./.test(entry.address);

            if (isPrivateLan) {
                candidates.push({
                    name,
                    address: entry.address
                });
            }
        }
    }

    const physical =
        candidates.find(candidate =>
            !/vpn|virtual|tunnel|tun|tap/i.test(candidate.name)
        );

    const selected =
        physical ||
        candidates[0] ||
        null;

    if (selected) {
        console.log(
            "[PhoneCast] Bonjour multicast interface:",
            selected.name,
            selected.address
        );
    } else {
        console.warn(
            "[PhoneCast] No private physical IPv4 interface found; using Bonjour defaults."
        );
    }

    return selected?.address || null;
}


/*
 * ============================================================
 * ACTIVE CONTROL CONNECTION
 * ============================================================
 */

let controlSocket = null;
let controlBuffer = Buffer.alloc(0);

let activeDevice = null;


/*
 * ============================================================
 * ACTIVE VIDEO CONNECTION
 * ============================================================
 */

let videoSocket = null;

let videoBuffer = Buffer.alloc(0);

let videoConnecting = false;


/*
 * ============================================================
 * CREATE WINDOW
 * ============================================================
 */

function createWindow() {

    mainWindow = new BrowserWindow({

        width: 1100,

        height: 700,

        minWidth: 900,

        minHeight: 600,

        backgroundColor: "#02070d",

        webPreferences: {

            preload:
                path.join(
                    __dirname,
                    "preload.js"
                ),

            contextIsolation: true,

            nodeIntegration: false
        }
    });

    mainWindow.loadFile(
        path.join(
            __dirname,
            "../renderer/index.html"
        )
    );

    mainWindow.webContents.on(
        "did-fail-load",
        (
            _event,
            errorCode,
            errorDescription,
            validatedURL
        ) => {
            console.error(
                "[PhoneCast] Renderer failed to load:",
                errorCode,
                errorDescription,
                validatedURL
            );
        }
    );

    mainWindow.webContents.on(
        "console-message",
        (
            _event,
            level,
            message,
            line,
            sourceId
        ) => {
            console.log(
                `[PhoneCast Renderer ${level}] ${message} (${sourceId}:${line})`
            );
        }
    );

    mainWindow.on(
        "closed",
        () => {

            stopDiscovery();

            disconnectVideo();

            disconnectControl();

            mainWindow = null;
        }
    );
}


/*
 * ============================================================
 * DEVICE DISCOVERY
 * ============================================================
 */

function startDiscovery() {

    console.log(
        "[PhoneCast] =================================================="
    );

    console.log(
        "[PhoneCast] Starting device discovery..."
    );

    console.log(
        "[PhoneCast] Service type: _phonecast._tcp"
    );

    /*
     * Stop previous discovery.
     */

    stopDiscovery();

    discoveredDevices.clear();

    /*
     * Tell renderer that a new search has started.
     */

    sendDevicesToRenderer();

    try {

        const discoveryInterface =
            getDiscoveryInterface();

        bonjour =
            discoveryInterface
                ? new Bonjour({
                    interface:
                        discoveryInterface
                })
                : new Bonjour();

        /*
         * Android advertises:
         *
         * _phonecast._tcp
         *
         * bonjour-service expects:
         *
         * type: "phonecast"
         * protocol: "tcp"
         */

        browser = bonjour.find(

            {
                type: "phonecast",
                protocol: "tcp"
            },

            service => {

                console.log(
                    "[PhoneCast] mDNS service discovered:"
                );

                console.log(
                    "[PhoneCast] Service name:",
                    service.name
                );

                console.log(
                    "[PhoneCast] Service host:",
                    service.host
                );

                console.log(
                    "[PhoneCast] Service port:",
                    service.port
                );

                console.log(
                    "[PhoneCast] Service addresses:",
                    service.addresses
                );


                /*
                 * Get addresses.
                 */

                const addresses =
                    Array.isArray(service.addresses)
                        ? service.addresses
                        : [];


                /*
                 * Prefer IPv4.
                 */

                const ipv4Address =
                    addresses.find(
                        address =>
                            typeof address === "string" &&
                            /^\d{1,3}(\.\d{1,3}){3}$/.test(
                                address
                            )
                    );


                /*
                 * Fall back to Bonjour hostname.
                 */

                const host =
                    ipv4Address ||
                    (
                        typeof service.host === "string"
                            ? service.host.replace(/\.$/, "")
                            : null
                    );


                /*
                 * Validate service.
                 */

                if (
                    !host ||
                    !Number.isInteger(service.port) ||
                    service.port <= 0 ||
                    service.port > 65535
                ) {

                    console.warn(
                        "[PhoneCast] Ignoring incomplete mDNS service:",
                        {
                            name: service.name,
                            host: service.host,
                            addresses,
                            port: service.port
                        }
                    );

                    return;
                }


                /*
                 * Create stable device ID.
                 */

                const device = {

                    id:
                        `${service.name || "PhoneCast"}-${host}-${service.port}`,

                    name:
                        service.name ||
                        "PhoneCast Phone",

                    host,

                    port:
                        Number(service.port),

                    addresses,

                    serviceType:
                        "_phonecast._tcp",

                    discoveredAt:
                        Date.now()
                };


                console.log(
                    "[PhoneCast] Resolved PhoneCast device:"
                );

                console.log(
                    device
                );


                /*
                 * A phone keeps the same service name and host while its
                 * control server may receive a new dynamic port after an
                 * Android activity/process restart. Treat that pair as the
                 * device identity so stale mDNS records cannot remain
                 * selectable alongside the current endpoint.
                 */
                const deviceIdentity =
                    `${device.name}-${device.host}`;

                for (
                    const [
                        existingId,
                        existingDevice
                    ]
                    of discoveredDevices.entries()
                ) {
                    if (
                        `${existingDevice.name}-${existingDevice.host}` ===
                        deviceIdentity
                    ) {
                        discoveredDevices.delete(existingId);
                    }
                }

                discoveredDevices.set(
                    device.id,
                    device
                );

                sendDevicesToRenderer();
            }
        );


        /*
         * Explicitly start browser.
         */

        if (
            browser &&
            typeof browser.start === "function"
        ) {

            browser.start();

            console.log(
                "[PhoneCast] Bonjour browser started."
            );
        }


        /*
         * Bonjour errors.
         */

        if (
            browser &&
            typeof browser.on === "function"
        ) {

            browser.on(
                "error",
                error => {

                    console.error(
                        "[PhoneCast] Bonjour browser error:",
                        error
                    );

                    sendDevicesToRenderer();
                }
            );
        }


        /*
         * Give mDNS enough time to resolve across Wi-Fi and VPN
         * adapters. A second query helps when the first multicast
         * announcement is missed during interface startup.
         */
        setTimeout(() => {
            if (
                browser &&
                typeof browser.update === "function"
            ) {
                browser.update();
            }
        }, 2000);

        discoveryTimer =
            setTimeout(
                () => {

                    discoveryTimer = null;

                    console.log(
                        `[PhoneCast] Discovery window finished. Devices found: ${discoveredDevices.size}`
                    );

                    sendDevicesToRenderer();

                },
                10000
            );

    } catch (error) {

        console.error(
            "[PhoneCast] Failed to start Bonjour discovery:",
            error
        );

        sendDevicesToRenderer();
    }
}


/*
 * ============================================================
 * SEND DEVICES TO RENDERER
 * ============================================================
 */

function sendDevicesToRenderer() {

    if (!mainWindow) {
        return;
    }

    const devices =
        Array.from(
            discoveredDevices.values()
        );

    mainWindow.webContents.send(
        "devices-updated",
        devices
    );
}


/*
 * ============================================================
 * STOP DISCOVERY
 * ============================================================
 */

function stopDiscovery() {

    try {

        if (discoveryTimer) {

            clearTimeout(
                discoveryTimer
            );

            discoveryTimer = null;
        }


        if (browser) {

            try {

                if (
                    typeof browser.stop === "function"
                ) {

                    browser.stop();
                }

            } catch (error) {

                console.warn(
                    "[PhoneCast] Bonjour browser stop warning:",
                    error
                );
            }

            browser = null;
        }


        if (bonjour) {

            try {

                bonjour.destroy();

            } catch (error) {

                console.warn(
                    "[PhoneCast] Bonjour destroy warning:",
                    error
                );
            }

            bonjour = null;
        }

    } catch (error) {

        console.error(
            "[PhoneCast] Discovery stop error:",
            error
        );
    }
}


/*
 * ============================================================
 * VALIDATE CONTROL DEVICE
 * ============================================================
 */

function isValidControlDevice(device) {

    if (
        !device ||
        typeof device !== "object"
    ) {

        return false;
    }

    if (
        typeof device.host !== "string" ||
        device.host.trim() === ""
    ) {

        return false;
    }

    if (
        !Number.isInteger(device.port) ||
        device.port <= 0 ||
        device.port > 65535
    ) {

        return false;
    }

    return true;
}

/*
 * ============================================================
 * CONTROL CONNECTION
 * ============================================================
 *
 * This connection handles:
 *
 * CONNECTION_REQUEST
 * REQUEST_ACCEPTED
 * AUTHENTICATION_REQUIRED
 * AUTHENTICATION_SUCCESS
 * SCREEN_CAPTURE_STARTED
 * VIDEO_STREAM_READY
 * VIDEO_STREAM_STOPPED
 * REQUEST_REJECTED
 * SESSION_TERMINATED
 *
 * Video itself uses a separate TCP connection.
 *
 * ============================================================
 */

function connectToDevice(device) {

    return new Promise(
        (resolve, reject) => {

            /*
             * ----------------------------------------------------
             * VALIDATE DEVICE
             * ----------------------------------------------------
             */

            if (
                !isValidControlDevice(device)
            ) {

                const error =
                    new Error(
                        "Invalid PhoneCast device information."
                    );

                console.error(
                    "[PhoneCast] Invalid device:",
                    device
                );

                sendConnectionEvent({

                    type:
                        "CONNECTION_ERROR",

                    message:
                        error.message
                });

                reject(error);

                return;
            }


            /*
             * ----------------------------------------------------
             * CLOSE PREVIOUS SESSION
             * ----------------------------------------------------
             */

            disconnectVideo();

            disconnectControl();


            /*
             * Store active device.
             */

            activeDevice =
                device;


            console.log(
                "[PhoneCast] Connecting to phone:"
            );

            console.log(
                `Host: ${device.host}`
            );

            console.log(
                `Control port: ${device.port}`
            );


            let socket;

            try {

                socket =
                    net.createConnection({

                        host:
                            device.host,

                        port:
                            device.port
                    });

            } catch (error) {

                console.error(
                    "[PhoneCast] Failed to create control socket:",
                    error
                );

                sendConnectionEvent({

                    type:
                        "CONNECTION_ERROR",

                    message:
                        error.message
                });

                reject(error);

                return;
            }


            /*
             * Make this the active control socket.
             */

            controlSocket =
                socket;

            controlBuffer =
                Buffer.alloc(0);


            /*
             * Track connection state.
             */

            let settled = false;

            let requestSent = false;

            let connectionTimer = null;


            /*
             * ----------------------------------------------------
             * FAILURE HANDLER
             * ----------------------------------------------------
             */

            const failConnection =
                error => {

                    const normalizedError =
                        error instanceof Error
                            ? error
                            : new Error(
                                String(
                                    error ||
                                    "Unknown connection error"
                                )
                            );


                    if (connectionTimer) {

                        clearTimeout(
                            connectionTimer
                        );

                        connectionTimer = null;
                    }


                    console.error(
                        "[PhoneCast] Control connection failed:",
                        normalizedError
                    );


                    sendConnectionEvent({

                        type:
                            "CONNECTION_ERROR",

                        message:
                            normalizedError.message
                    });


                    if (!settled) {

                        settled = true;

                        reject(
                            normalizedError
                        );
                    }
                };


            /*
             * ----------------------------------------------------
             * CONNECTION TIMEOUT
             * ----------------------------------------------------
             *
             * Only applies until the TCP connection is
             * established and the request is written.
             *
             * Once REQUEST is successfully written,
             * the timer is removed because the phone may
             * take time to show the popup and authenticate.
             */

            connectionTimer =
                setTimeout(
                    () => {

                        if (
                            requestSent ||
                            settled
                        ) {

                            return;
                        }

                        failConnection(
                            new Error(
                                "Timed out while connecting to the phone."
                            )
                        );

                        try {

                            socket.destroy();

                        } catch (_) {}

                    },
                    10000
                );


            /*
             * ----------------------------------------------------
             * TCP OPTIONS
             * ----------------------------------------------------
             */

            try {

                socket.setNoDelay(
                    true
                );

                socket.setKeepAlive(
                    true,
                    5000
                );

            } catch (error) {

                console.warn(
                    "[PhoneCast] Socket option warning:",
                    error
                );
            }


            /*
             * ----------------------------------------------------
             * CONTROL CONNECTED
             * ----------------------------------------------------
             */

            socket.on(
                "connect",
                () => {

                    console.log(
                        "[PhoneCast] Control TCP connection established."
                    );


                    /*
                     * Generate unique request ID.
                     */

                    const requestId =
                        `${Date.now()}-${Math.random()
                            .toString(36)
                            .substring(2, 8)}`;


                    /*
                     * Build request.
                     *
                     * IMPORTANT:
                     * This is the message the phone receives.
                     */

                    const request = {

                        type:
                            "CONNECTION_REQUEST",

                        requestId:
                            requestId,

                        laptopName:
                            getLaptopName(),

                        message:
                            `${getLaptopName()} wants to connect for screen sharing`
                    };


                    console.log(
                        "[PhoneCast] Preparing CONNECTION_REQUEST:"
                    );

                    console.log(
                        request
                    );


                    /*
                     * Send request.
                     *
                     * The REQUEST_SENT event is emitted
                     * ONLY after the socket write callback.
                     */

                    const queued =
                        sendControlJson(
                            request,
                            writeError => {

                                if (writeError) {

                                    failConnection(
                                        writeError
                                    );

                                    return;
                                }


                                /*
                                 * The request has successfully
                                 * passed through Node's socket write.
                                 */

                                requestSent =
                                    true;


                                if (connectionTimer) {

                                    clearTimeout(
                                        connectionTimer
                                    );

                                    connectionTimer =
                                        null;
                                }


                                console.log(
                                    "[PhoneCast] CONNECTION_REQUEST successfully written to TCP socket."
                                );


                                sendConnectionEvent({

                                    type:
                                        "REQUEST_SENT",

                                    requestId:
                                        requestId,

                                    device:
                                        device
                                });


                                if (!settled) {

                                    settled = true;

                                    resolve({

                                        success:
                                            true,

                                        requestId:
                                            requestId
                                    });
                                }
                            }
                        );


                    /*
                     * If write could not even be queued,
                     * fail immediately.
                     */

                    if (!queued) {

                        failConnection(
                            new Error(
                                "Could not write CONNECTION_REQUEST to the control socket."
                            )
                        );
                    }
                }
            );


            /*
             * ----------------------------------------------------
             * CONTROL DATA
             * ----------------------------------------------------
             */

            socket.on(
                "data",
                data => {

                    try {

                        if (
                            !Buffer.isBuffer(data)
                        ) {

                            data =
                                Buffer.from(data);
                        }


                        controlBuffer =
                            Buffer.concat([
                                controlBuffer,
                                data
                            ]);


                        processControlBuffer();

                    } catch (error) {

                        console.error(
                            "[PhoneCast] Control data processing error:",
                            error
                        );

                        sendConnectionEvent({

                            type:
                                "CONNECTION_ERROR",

                            message:
                                error.message
                        });
                    }
                }
            );


            /*
             * ----------------------------------------------------
             * CONTROL ERROR
             * ----------------------------------------------------
             */

            socket.on(
                "error",
                error => {

                    console.error(
                        "[PhoneCast] Control connection error:",
                        error
                    );

                    failConnection(
                        error
                    );
                }
            );


            /*
             * ----------------------------------------------------
             * CONTROL CLOSED
             * ----------------------------------------------------
             */

            socket.on(
                "close",
                hadError => {

                    if (connectionTimer) {

                        clearTimeout(
                            connectionTimer
                        );

                        connectionTimer =
                            null;
                    }


                    console.log(
                        "[PhoneCast] Control connection closed.",
                        {
                            hadError,
                            requestSent
                        }
                    );


                    /*
                     * IMPORTANT:
                     *
                     * If this is an old socket that was
                     * replaced by a new socket, do not allow
                     * its close event to destroy the new
                     * session.
                     */

                    if (
                        controlSocket !== socket
                    ) {

                        console.log(
                            "[PhoneCast] Ignoring stale control socket close event."
                        );

                        return;
                    }


                    /*
                     * This socket is still the active socket.
                     */

                    controlSocket =
                        null;

                    controlBuffer =
                        Buffer.alloc(0);


                    /*
                     * Stop video associated with this
                     * control connection.
                     */

                    disconnectVideo();


                    /*
                     * Notify renderer.
                     */

                    sendConnectionEvent({

                        type:
                            "CONNECTION_CLOSED"
                    });


                    /*
                     * If TCP closed before the request
                     * was sent, the connect attempt failed.
                     */

                    if (
                        !requestSent &&
                        !settled
                    ) {

                        settled =
                            true;

                        reject(
                            new Error(
                                "Control connection closed before the connection request was sent."
                            )
                        );
                    }
                }
            );
        }
    );
}


/*
 * ============================================================
 * PROCESS CONTROL JSON
 * ============================================================
 */

function processControlBuffer() {

    while (true) {

        const newlineIndex =
            controlBuffer.indexOf(
                0x0a
            );


        if (
            newlineIndex === -1
        ) {

            return;
        }


        const line =
            controlBuffer
                .subarray(
                    0,
                    newlineIndex
                )
                .toString(
                    "utf8"
                )
                .trim();


        controlBuffer =
            controlBuffer.subarray(
                newlineIndex + 1
            );


        if (!line) {

            continue;
        }


        try {

            const message =
                JSON.parse(
                    line
                );


            console.log(
                "[PhoneCast] Control message:",
                message
            );

            sendConnectionEvent({
                type: "CONTROL_MESSAGE_RECEIVED",
                messageType: message.type,
                requestId: message.requestId || null
            });


            handleControlMessage(
                message
            );

        } catch (error) {

            console.error(
                "[PhoneCast] Invalid control JSON:",
                line,
                error
            );
        }
    }
}


/*
 * ============================================================
 * CONTROL MESSAGE HANDLER
 * ============================================================
 */

function handleControlMessage(
    message
) {

    if (
        !message ||
        typeof message !== "object"
    ) {

        console.warn(
            "[PhoneCast] Ignoring invalid control message:",
            message
        );

        return;
    }


    switch (
        message.type
    ) {

        case "REQUEST_ACCEPTED":

            console.log(
                "[PhoneCast] Phone accepted connection request."
            );

            sendConnectionEvent(
                message
            );

            break;


        case "AUTHENTICATION_REQUIRED":

            console.log(
                "[PhoneCast] Phone requires authentication."
            );

            sendConnectionEvent(
                message
            );

            break;


        case "AUTHENTICATION_SUCCESS":

            console.log(
                "[PhoneCast] Phone authentication successful."
            );

            sendConnectionEvent(
                message
            );

            break;


        case "SCREEN_CAPTURE_STARTED":

            console.log(
                "[PhoneCast] Screen capture started."
            );

            sendConnectionEvent(
                message
            );

            break;


        case "SCREEN_CAPTURE_READY":

            console.log(
                "[PhoneCast] Screen capture ready."
            );

            sendConnectionEvent(
                message
            );

            break;


        case "SCREEN_SHARE_READY":

            console.log(
                "[PhoneCast] Screen share ready."
            );

            sendConnectionEvent(
                message
            );

            break;


        case "VIDEO_STREAM_READY":

            console.log(
                "[PhoneCast] Video stream ready."
            );

            console.log(
                `Video port: ${message.videoPort}`
            );


            sendConnectionEvent(
                message
            );


            if (
                activeDevice &&
                Number.isInteger(
                    Number(
                        message.videoPort
                    )
                ) &&
                Number(
                    message.videoPort
                ) > 0
            ) {

                connectVideoStream(

                    activeDevice.host,

                    Number(
                        message.videoPort
                    )
                );
            }

            break;


        case "VIDEO_STREAM_STOPPED":

            console.log(
                "[PhoneCast] Phone stopped video stream."
            );

            disconnectVideo();

            sendConnectionEvent(
                message
            );

            break;


        case "SCREEN_CAPTURE_FAILED":

            console.error(
                "[PhoneCast] Screen capture failed:",
                message.reason
            );

            disconnectVideo();

            sendConnectionEvent(
                message
            );

            break;


        case "REQUEST_REJECTED":

            console.log(
                "[PhoneCast] Phone rejected connection request."
            );

            disconnectVideo();

            sendConnectionEvent(
                message
            );

            break;


        case "SESSION_TERMINATED":

            console.log(
                "[PhoneCast] Phone terminated the session."
            );

            disconnectVideo();

            sendConnectionEvent(
                message
            );

            break;


        default:

            console.log(
                "[PhoneCast] Unhandled control message:",
                message
            );

            sendConnectionEvent(
                message
            );

            break;
    }
}


/*
 * ============================================================
 * SEND CONTROL JSON
 * ============================================================
 *
 * callback(error)
 *
 * callback is called after Node accepts the write operation.
 *
 * ============================================================
 */

function sendControlJson(
    message,
    onComplete
) {

    const callback =
        typeof onComplete === "function"
            ? onComplete
            : () => {};


    /*
     * Verify socket.
     */

    if (
        !controlSocket ||
        controlSocket.destroyed ||
        !controlSocket.writable
    ) {

        console.error(
            "[PhoneCast] No writable active control connection."
        );

        return false;
    }


    let json;

    try {

        json =
            JSON.stringify(
                message
            ) + "\n";

    } catch (error) {

        console.error(
            "[PhoneCast] Failed to serialize control message:",
            error
        );

        callback(
            error
        );

        return false;
    }


    /*
     * Capture current socket.
     *
     * This prevents a later socket replacement from
     * confusing the write callback.
     */

    const socket =
        controlSocket;


    try {

        socket.write(
            json,
            "utf8",
            error => {

                if (error) {

                    console.error(
                        "[PhoneCast] Control socket write failed:",
                        error
                    );

                    callback(
                        error
                    );

                    return;
                }


                console.log(
                    "[PhoneCast] Control message write completed:",
                    message
                );


                callback(
                    null
                );
            }
        );


        console.log(
            "[PhoneCast] Control message queued:",
            message
        );


        return true;

    } catch (error) {

        console.error(
            "[PhoneCast] Failed to send control message:",
            error
        );

        callback(
            error
        );

        return false;
    }
}


/*
 * ============================================================
 * H.264 VIDEO CONNECTION
 * ============================================================
 */

function connectVideoStream(
    host,
    port
) {

    if (
        typeof host !== "string" ||
        host.trim() === "" ||
        !Number.isInteger(
            Number(port)
        ) ||
        Number(port) <= 0 ||
        Number(port) > 65535
    ) {

        console.error(
            "[PhoneCast] Invalid video connection details:",
            {
                host,
                port
            }
        );

        return;
    }


    /*
     * Avoid duplicate video connections.
     */

    disconnectVideo();

    videoConnecting =
        true;

    videoBuffer =
        Buffer.alloc(0);


    console.log(
        "[PhoneCast] Connecting to H.264 video server..."
    );

    console.log(
        `Host: ${host}`
    );

    console.log(
        `Video port: ${port}`
    );


    let socket;

    try {

        socket =
            net.createConnection({

                host,

                port:
                    Number(port)
            });

    } catch (error) {

        videoConnecting =
            false;

        console.error(
            "[PhoneCast] Failed to create video socket:",
            error
        );

        sendVideoEvent({

            type:
                "VIDEO_SOCKET_ERROR",

            message:
                error.message
        });

        return;
    }


    videoSocket =
        socket;


    try {

        socket.setNoDelay(
            true
        );

        socket.setKeepAlive(
            true,
            5000
        );

    } catch (error) {

        console.warn(
            "[PhoneCast] Video socket option warning:",
            error
        );
    }


    /*
     * ----------------------------------------------------
     * VIDEO CONNECTED
     * ----------------------------------------------------
     */

    socket.on(
        "connect",
        () => {

            videoConnecting =
                false;

            console.log(
                "[PhoneCast] H.264 video TCP connected."
            );

            sendVideoEvent({

                type:
                    "VIDEO_SOCKET_CONNECTED"
            });
        }
    );


    /*
     * ----------------------------------------------------
     * VIDEO DATA
     * ----------------------------------------------------
     */

    socket.on(
        "data",
        data => {

            try {

                if (
                    !Buffer.isBuffer(data)
                ) {

                    data =
                        Buffer.from(data);
                }


                /*
                 * Phone protocol:
                 *
                 * 4 bytes packet type
                 * 4 bytes payload size
                 * payload
                 */

                videoBuffer =
                    Buffer.concat([
                        videoBuffer,
                        data
                    ]);


                processVideoBuffer();

            } catch (error) {

                console.error(
                    "[PhoneCast] H.264 data processing error:",
                    error
                );

                sendVideoEvent({

                    type:
                        "VIDEO_SOCKET_ERROR",

                    message:
                        error.message
                });
            }
        }
    );


    /*
     * ----------------------------------------------------
     * VIDEO ERROR
     * ----------------------------------------------------
     */

    socket.on(
        "error",
        error => {

            videoConnecting =
                false;

            console.error(
                "[PhoneCast] H.264 video socket error:",
                error
            );

            sendVideoEvent({

                type:
                    "VIDEO_SOCKET_ERROR",

                message:
                    error.message
            });
        }
    );


    /*
     * ----------------------------------------------------
     * VIDEO CLOSED
     * ----------------------------------------------------
     */

    socket.on(
        "close",
        () => {

            videoConnecting =
                false;

            console.log(
                "[PhoneCast] H.264 video socket closed."
            );


            /*
             * Ignore stale sockets.
             */

            if (
                videoSocket !== socket
            ) {

                console.log(
                    "[PhoneCast] Ignoring stale video socket close event."
                );

                return;
            }


            videoSocket =
                null;


            sendVideoEvent({

                type:
                    "VIDEO_SOCKET_CLOSED"
            });
        }
    );
}


/*
 * ============================================================
 * PROCESS H.264 PACKETS
 * ============================================================
 */

function processVideoBuffer() {

    /*
     * Minimum packet:
     *
     * 4 bytes type
     * 4 bytes size
     */

    while (
        videoBuffer.length >= 8
    ) {

        const packetType =
            videoBuffer.readInt32BE(
                0
            );


        const payloadSize =
            videoBuffer.readInt32BE(
                4
            );


        /*
         * Safety validation.
         */

        if (
            payloadSize < 0 ||
            payloadSize > 8 * 1024 * 1024
        ) {

            console.error(
                "[PhoneCast] Invalid H.264 packet size:",
                payloadSize
            );

            disconnectVideo();

            return;
        }


        const totalSize =
            8 + payloadSize;


        /*
         * Wait for complete packet.
         */

        if (
            videoBuffer.length <
            totalSize
        ) {

            return;
        }


        /*
         * Extract payload.
         */

        const payload =
            videoBuffer.subarray(
                8,
                totalSize
            );


        videoBuffer =
            videoBuffer.subarray(
                totalSize
            );


        /*
         * Packet type 1:
         *
         * CODEC HEADER
         */

        if (
            packetType === 1
        ) {

            processCodecHeader(
                payload
            );

            continue;
        }


        /*
         * Packet type 2:
         *
         * H.264 FRAME
         */

        if (
            packetType === 2
        ) {

            processVideoFrame(
                payload
            );

            continue;
        }


        console.warn(
            "[PhoneCast] Unknown video packet type:",
            packetType
        );
    }
}


/*
 * ============================================================
 * CODEC HEADER
 * ============================================================
 *
 * Header:
 *
 * int protocolVersion
 * int width
 * int height
 * int frameRate
 * int bitrate
 * int csd0Length
 * byte[] csd0
 * int csd1Length
 * byte[] csd1
 *
 * ============================================================
 */

function processCodecHeader(
    payload
) {

    try {

        let offset =
            0;


        if (
            payload.length < 24
        ) {

            throw new Error(
                "Codec header is too small."
            );
        }


        const protocolVersion =
            payload.readInt32BE(
                offset
            );

        offset += 4;


        const width =
            payload.readInt32BE(
                offset
            );

        offset += 4;


        const height =
            payload.readInt32BE(
                offset
            );

        offset += 4;


        const frameRate =
            payload.readInt32BE(
                offset
            );

        offset += 4;


        const bitrate =
            payload.readInt32BE(
                offset
            );

        offset += 4;


        const csd0Length =
            payload.readInt32BE(
                offset
            );

        offset += 4;


        if (
            csd0Length < 0 ||
            offset + csd0Length >
                payload.length
        ) {

            throw new Error(
                "Invalid SPS length."
            );
        }


        const csd0 =
            Buffer.from(
                payload.subarray(
                    offset,
                    offset + csd0Length
                )
            );


        offset +=
            csd0Length;


        if (
            offset + 4 >
            payload.length
        ) {

            throw new Error(
                "Missing PPS length."
            );
        }


        const csd1Length =
            payload.readInt32BE(
                offset
            );

        offset += 4;


        if (
            csd1Length < 0 ||
            offset + csd1Length >
                payload.length
        ) {

            throw new Error(
                "Invalid PPS length."
            );
        }


        const csd1 =
            Buffer.from(
                payload.subarray(
                    offset,
                    offset + csd1Length
                )
            );


        console.log(
            "[PhoneCast] H.264 codec header received:"
        );


        console.log({

            protocolVersion,

            width,

            height,

            frameRate,

            bitrate,

            spsBytes:
                csd0.length,

            ppsBytes:
                csd1.length
        });


        /*
         * Send codec information to renderer.
         */

        sendVideoEvent({

            type:
                "VIDEO_CODEC_HEADER",

            protocolVersion,

            width,

            height,

            frameRate,

            bitrate,

            csd0:
                new Uint8Array(
                    csd0
                ),

            csd1:
                new Uint8Array(
                    csd1
                )
        });

    } catch (error) {

        console.error(
            "[PhoneCast] Failed to parse H.264 codec header:",
            error
        );

        sendVideoEvent({

            type:
                "VIDEO_CODEC_ERROR",

            message:
                error.message
        });
    }
}


/*
 * ============================================================
 * H.264 FRAME
 * ============================================================
 *
 * FRAME payload:
 *
 * long presentationTimeUs
 * int flags
 * byte[] H264
 *
 * ============================================================
 */

function processVideoFrame(
    payload
) {

    try {

        if (
            payload.length < 12
        ) {

            return;
        }


        const presentationTimeUs =
            payload.readBigInt64BE(
                0
            );


        const flags =
            payload.readInt32BE(
                8
            );


        const frameData =
            payload.subarray(
                12
            );


        /*
         * Copy before crossing Electron
         * process boundary.
         */

        const frame =
            new Uint8Array(
                frameData
            );


        sendVideoFrame(

            frame,

            presentationTimeUs,

            flags
        );

    } catch (error) {

        console.error(
            "[PhoneCast] Failed to process H.264 frame:",
            error
        );
    }
}


/*
 * ============================================================
 * SEND VIDEO FRAME TO RENDERER
 * ============================================================
 */

function sendVideoFrame(
    frame,
    presentationTimeUs,
    flags
) {

    if (!mainWindow) {

        return;
    }


    mainWindow.webContents.send(

        "video-frame",

        {

            data:
                frame,

            presentationTimeUs:
                presentationTimeUs.toString(),

            flags:
                flags
        }
    );
}


/*
 * ============================================================
 * VIDEO EVENTS
 * ============================================================
 */

function sendVideoEvent(
    event
) {

    if (!mainWindow) {

        return;
    }


    mainWindow.webContents.send(

        "video-event",

        event
    );
}


/*
 * ============================================================
 * DISCONNECT VIDEO
 * ============================================================
 */

function disconnectVideo() {

    videoConnecting =
        false;

    videoBuffer =
        Buffer.alloc(0);


    if (!videoSocket) {

        return;
    }


    const socket =
        videoSocket;


    videoSocket =
        null;


    console.log(
        "[PhoneCast] Closing video connection."
    );


    try {

        socket.destroy();

    } catch (error) {

        console.error(
            "[PhoneCast] Video socket close error:",
            error
        );
    }
}


/*
 * ============================================================
 * DISCONNECT CONTROL
 * ============================================================
 */

function disconnectControl() {

    controlBuffer =
        Buffer.alloc(0);


    if (!controlSocket) {

        return;
    }


    const socket =
        controlSocket;


    controlSocket =
        null;


    console.log(
        "[PhoneCast] Closing control connection."
    );


    try {

        socket.destroy();

    } catch (error) {

        console.error(
            "[PhoneCast] Control socket close error:",
            error
        );
    }
}


/*
 * ============================================================
 * CONNECTION EVENTS
 * ============================================================
 */

function sendConnectionEvent(
    event
) {

    if (!mainWindow) {

        return;
    }


    try {

        mainWindow.webContents.send(

            "connection-event",

            event
        );

    } catch (error) {

        console.error(
            "[PhoneCast] Failed to send connection event:",
            error
        );
    }
}


/*
 * ============================================================
 * LAPTOP NAME
 * ============================================================
 */

function getLaptopName() {

    return "Yash-PC";
}


/*
 * ============================================================
 * IPC: SEARCH DEVICES
 * ============================================================
 */

ipcMain.handle(

    "search-devices",

    async () => {

        console.log(
            "[PhoneCast] IPC: search-devices"
        );


        try {

            startDiscovery();

            return {

                success:
                    true
            };

        } catch (error) {

            console.error(
                "[PhoneCast] Search devices failed:",
                error
            );

            return {

                success:
                    false,

                error:
                    error.message
            };
        }
    }
);


/*
 * ============================================================
 * IPC: CONNECT TO DEVICE
 * ============================================================
 */

ipcMain.handle(

    "connect-to-device",

    async (
        _event,
        device
    ) => {

        console.log(
            "[PhoneCast] IPC: connect-to-device"
        );

        console.log(
            "[PhoneCast] Device received from renderer:",
            device
        );


        try {

            return await connectToDevice(
                device
            );

        } catch (error) {

            console.error(
                "[PhoneCast] Failed to connect:",
                error
            );


            return {

                success:
                    false,

                error:
                    error.message
            };
        }
    }
);


/*
 * ============================================================
 * IPC: DISCONNECT SESSION
 * ============================================================
 */

ipcMain.handle(

    "disconnect-session",

    async () => {

        console.log(
            "[PhoneCast] IPC: disconnect-session"
        );


        /*
         * Tell phone that laptop intentionally
         * wants to terminate the session.
         */

        if (
            controlSocket &&
            !controlSocket.destroyed &&
            controlSocket.writable
        ) {

            sendControlJson({

                type:
                    "TERMINATE_SESSION"

            });
        }


        disconnectVideo();

        disconnectControl();


        activeDevice =
            null;


        return {

            success:
                true
        };
    }
);


/*
 * ============================================================
 * IPC: REMOTE INPUT
 * ============================================================
 */

ipcMain.handle(

    "send-input",

    async (
        _event,
        input
    ) => {

        if (
            !input ||
            typeof input !== "object"
        ) {

            return {
                success: false,
                error: "Invalid input payload."
            };
        }

        const message = {
            ...input,
            type: String(input.type || "")
        };

        if (
            ![
                "INPUT_TOUCH",
                "INPUT_TEXT",
                "INPUT_KEY"
            ].includes(message.type)
        ) {

            return {
                success: false,
                error: "Unsupported input type."
            };
        }

        if (
            !activeDevice ||
            !controlSocket ||
            controlSocket.destroyed
        ) {

            return {
                success: false,
                error: "No authorized PhoneCast session."
            };
        }

        const sent =
            sendControlJson(message);

        return {
            success: sent
        };
    }
);


/*
 * ============================================================
 * APP READY
 * ============================================================
 */

app.whenReady().then(

    () => {

        createWindow();


        app.on(

            "activate",

            () => {

                if (

                    BrowserWindow
                        .getAllWindows()
                        .length === 0

                ) {

                    createWindow();
                }
            }
        );
    }
);


/*
 * ============================================================
 * APP CLOSE
 * ============================================================
 */

app.on(

    "window-all-closed",

    () => {

        stopDiscovery();

        disconnectVideo();

        disconnectControl();


        if (
            process.platform !==
            "darwin"
        ) {

            app.quit();
        }
    }
);