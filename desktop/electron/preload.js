const {
    contextBridge,
    ipcRenderer
} = require("electron");


contextBridge.exposeInMainWorld(
    "phoneCast",
    {

        // =====================================================
        // DEVICE DISCOVERY
        // =====================================================

        searchDevices: () => {

            return ipcRenderer.invoke(
                "search-devices"
            );
        },


        // =====================================================
        // CONNECT TO PHONE
        // =====================================================

        connectToDevice: (
            device
        ) => {

            return ipcRenderer.invoke(
                "connect-to-device",
                device
            );
        },


        // =====================================================
        // DISCONNECT SESSION
        // =====================================================

        disconnectSession: () => {

            return ipcRenderer.invoke(
                "disconnect-session"
            );
        },

        sendInput: (
            input
        ) => {

            return ipcRenderer.invoke(
                "send-input",
                input
            );
        },


        // =====================================================
        // DEVICE DISCOVERY EVENTS
        // =====================================================

        onDevicesUpdated: (
            callback
        ) => {

            if (
                typeof callback !==
                "function"
            ) {
                return;
            }

            ipcRenderer.on(
                "devices-updated",

                (
                    _event,
                    devices
                ) => {

                    callback(
                        devices
                    );
                }
            );
        },


        // =====================================================
        // CONNECTION EVENTS
        // =====================================================

        onConnectionEvent: (
            callback
        ) => {

            if (
                typeof callback !==
                "function"
            ) {
                return;
            }

            ipcRenderer.on(
                "connection-event",

                (
                    _event,
                    event
                ) => {

                    callback(
                        event
                    );
                }
            );
        },


        // =====================================================
        // VIDEO EVENTS
        // =====================================================

        onVideoEvent: (
            callback
        ) => {

            if (
                typeof callback !==
                "function"
            ) {
                return;
            }

            ipcRenderer.on(
                "video-event",

                (
                    _event,
                    event
                ) => {

                    callback(
                        event
                    );
                }
            );
        },


        // =====================================================
        // H.264 VIDEO FRAMES
        // =====================================================

        onVideoFrame: (
            callback
        ) => {

            if (
                typeof callback !==
                "function"
            ) {
                return;
            }

            ipcRenderer.on(
                "video-frame",

                (
                    _event,
                    frame
                ) => {

                    callback(
                        frame
                    );
                }
            );
        },


        // =====================================================
        // REMOVE LISTENERS
        // =====================================================

        removeAllListeners: (
            channel
        ) => {

            const allowedChannels = [
                "devices-updated",
                "connection-event",
                "video-event",
                "video-frame"
            ];

            if (
                !allowedChannels.includes(
                    channel
                )
            ) {

                return;
            }

            ipcRenderer.removeAllListeners(
                channel
            );
        }
    }
);