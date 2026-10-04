"use strict";


export function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


export function getDeviceDisplayName(
    device
) {

    return (
        device?.userName ||
        device?.username ||
        device?.name ||
        device?.deviceName ||
        "Android Phone"
    );
}


export function formatDate(
    timestamp
) {

    if (!timestamp) {

        return "Unknown";
    }


    const numeric =
        Number(timestamp);


    const date =
        new Date(
            Number.isFinite(numeric)
                ? numeric
                : timestamp
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Unknown";
    }


    return date.toLocaleString(
        "en-IN",
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric",

            hour:
                "numeric",

            minute:
                "2-digit",

            hour12:
                true
        }
    );
}


export function showError(
    element,
    message
) {

    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.classList.remove(
        "hidden"
    );
}


export function hideElement(
    element
) {

    if (!element) {
        return;
    }


    element.classList.add(
        "hidden"
    );
}


export function toUint8Array(
    value
) {

    if (!value) {
        return null;
    }


    if (
        value instanceof Uint8Array
    ) {

        return value;
    }


    if (
        value instanceof ArrayBuffer
    ) {

        return new Uint8Array(
            value
        );
    }


    if (
        ArrayBuffer.isView(
            value
        )
    ) {

        return new Uint8Array(
            value.buffer,
            value.byteOffset,
            value.byteLength
        );
    }


    if (
        Array.isArray(
            value
        )
    ) {

        return Uint8Array.from(
            value
        );
    }


    if (
        typeof value ===
        "object"
    ) {

        const keys =
            Object.keys(value)
                .filter(
                    key =>
                        /^\d+$/.test(
                            key
                        )
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        Number(a) -
                        Number(b)
                );


        if (keys.length) {

            return Uint8Array.from(
                keys.map(
                    key =>
                        Number(
                            value[key]
                        ) & 0xff
                )
            );
        }
    }


    return null;
}


export function readBE32(
    data,
    offset
) {

    return (
        (
            data[offset] *
            0x1000000
        ) +

        (
            (
                data[offset + 1]
                << 16
            ) >>> 0
        ) +

        (
            data[offset + 2]
            << 8
        ) +

        data[offset + 3]
    ) >>> 0;
}


export function normalizeTimestamp(
    value,
    fallback
) {

    if (
        typeof value ===
        "bigint"
    ) {

        return Number(
            value
        );
    }


    const number =
        Number(value);


    if (
        Number.isFinite(
            number
        )
    ) {

        return Math.max(
            0,
            Math.round(
                number
            )
        );
    }


    return fallback;
}


export function delay(
    milliseconds
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );
}