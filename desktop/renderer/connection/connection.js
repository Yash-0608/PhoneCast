"use strict";


import {
    state
} from "../state/appState.js";


export async function loadAccount() {

    try {

        if (
            typeof window.phoneCast?.getAccount ===
            "function"
        ) {

            const result =
                await window.phoneCast
                    .getAccount();


            if (
                result?.success &&
                result.account
            ) {

                state.account =
                    result.account;

                state.connectionHistory =
                    Array.isArray(
                        result.account.connectionHistory
                    )
                        ? result.account.connectionHistory
                        : [];

                return;
            }
        }


        /*
         * Temporary local fallback.
         *
         * The current preload does not yet expose
         * account APIs, so the desktop UI remains
         * usable.
         */

        const saved =
            localStorage.getItem(
                "phonecast-account"
            );


        if (saved) {

            state.account =
                JSON.parse(
                    saved
                );

            state.connectionHistory =
                Array.isArray(
                    state.account?.connectionHistory
                )
                    ? state.account.connectionHistory
                    : [];
        }

    } catch (error) {

        console.error(
            "[PhoneCast] Account load failed:",
            error
        );
    }
}


export async function createAccount(
    laptopName,
    password
) {

    try {

        if (
            typeof window.phoneCast?.createAccount ===
            "function"
        ) {

            const result =
                await window.phoneCast
                    .createAccount({

                        laptopName,

                        password,

                        confirmPassword:
                            password
                    });


            if (
                result?.success
            ) {

                await loadAccount();

                return result;
            }


            throw new Error(
                result?.error ||
                "Account creation failed."
            );
        }


        /*
         * Local fallback until the Electron
         * account backend is connected.
         */

        state.account = {

            accountCreated:
                true,

            laptopName,

            connectionHistory:
                []
        };


        state.connectionHistory =
            [];


        localStorage.setItem(
            "phonecast-account",
            JSON.stringify(
                state.account
            )
        );


        return {

            success:
                true,

            account:
                state.account
        };

    } catch (error) {

        console.error(
            "[PhoneCast] Account creation failed:",
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


export async function searchDevices() {

    if (
        state.searching
    ) {

        return;
    }


    if (
        typeof window.phoneCast?.searchDevices !==
        "function"
    ) {

        throw new Error(
            "Device discovery service is unavailable."
        );
    }


    state.searching =
        true;


    try {

        await window.phoneCast
            .searchDevices();

    } catch (error) {

        state.searching =
            false;

        throw error;
    }


    /*
     * Safety timeout.
     *
     * Discovery events normally arrive through
     * onDevicesUpdated.
     */

    setTimeout(
        () => {

            if (
                state.searching
            ) {

                state.searching =
                    false;
            }

        },
        6000
    );
}


export async function connectToDevice(
    device
) {

    if (!device) {

        throw new Error(
            "No phone selected."
        );
    }


    if (
        state.connecting
    ) {

        return;
    }


    if (
        typeof window.phoneCast?.connectToDevice !==
        "function"
    ) {

        throw new Error(
            "Connection service is unavailable."
        );
    }


    state.selectedDevice =
        device;

    state.connecting =
        true;


    const result =
        await window.phoneCast
            .connectToDevice(
                device
            );


    if (
        result?.success === false
    ) {

        state.connecting =
            false;

        throw new Error(
            result.error ||
            "Connection request failed."
        );
    }


    state.activeRequestId =
        result?.requestId ||
        null;


    return result;
}


export async function disconnectSession() {

    try {

        if (
            typeof window.phoneCast?.disconnectSession ===
            "function"
        ) {

            await window.phoneCast
                .disconnectSession();
        }


    } catch (error) {

        console.error(
            "[PhoneCast] Disconnect failed:",
            error
        );
    }


    state.connecting =
        false;

    state.activeRequestId =
        null;
}


export async function sendRemoteInput(
    input
) {

    if (
        !input ||
        typeof input !== "object"
    ) {
        return;
    }

    if (
        typeof window.phoneCast?.sendInput !==
        "function"
    ) {
        console.error(
            "[PhoneCast] Remote input API is unavailable."
        );
        return;
    }

    const requestId =
        state.activeRequestId;

    if (!requestId) {
        return;
    }

    try {

        const result =
            await window.phoneCast.sendInput({
                ...input,
                requestId
            });

        if (
            result?.success === false
        ) {
            console.error(
                "[PhoneCast] Remote input failed:",
                result.error
            );
        }

    } catch (error) {

        console.error(
            "[PhoneCast] Remote input failed:",
            error
        );
    }
}


export async function refreshHistory() {

    try {

        if (
            typeof window.phoneCast?.getConnectionHistory !==
            "function"
        ) {

            return;
        }


        const result =
            await window.phoneCast
                .getConnectionHistory();


        if (
            result?.success
        ) {

            state.connectionHistory =
                Array.isArray(
                    result.history
                )
                    ? result.history
                    : [];
        }

    } catch (error) {

        console.error(
            "[PhoneCast] History refresh failed:",
            error
        );
    }
}