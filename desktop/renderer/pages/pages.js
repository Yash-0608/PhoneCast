"use strict";

import {
    state
} from "../state/appState.js";


import {
    escapeHtml,
    getDeviceDisplayName,
    formatDate,
    showError
} from "../ui/helpers.js";


import {
    createAccount,
    connectToDevice,
    disconnectSession,
    refreshHistory,
    sendRemoteInput
} from "../connection/connection.js";


import {
    initializeVideoViewer
} from "../video/video.js";


import {
    navigate
} from "../core/navigation.js";


import {
    beginDeviceDiscovery
} from "../core/events.js";

const app =
    document.getElementById(
        "app"
    );


// ============================================================
// BASIC VALIDATION
// ============================================================

function ensureApp() {

    if (!app) {

        console.error(
            "[PhoneCast Pages] #app element not found."
        );

        return false;
    }

    return true;
}


function getErrorMessage(
    error,
    fallback
) {

    if (
        error &&
        typeof error.message ===
        "string" &&
        error.message.trim()
    ) {
        return error.message;
    }

    return fallback;
}


// ============================================================
// WELCOME
// ============================================================

export function showWelcomePage() {

    if (!ensureApp()) {
        return;
    }


    state.currentPage =
        "welcome";


    app.innerHTML = `

        <div class="page-shell welcome-page">

            <div class="welcome-content">

                <div class="welcome-copy">

                    <div class="welcome-title">
                        Hello
                    </div>

                    <div class="welcome-subtitle">
                        Welcome to
                    </div>

                    <div class="welcome-brand">
                        PhoneCast
                    </div>

                    <p class="welcome-description">
                        Connect your phone to your laptop
                        and share your screen wirelessly.
                    </p>


                    <div class="feature-strip">

                        <div class="feature-item">

                            <div class="feature-icon">
                                ${phonecastGlyph("wifi", 22)}
                            </div>

                            <div class="feature-title">
                                WIRELESS
                            </div>

                            <div class="feature-subtitle">
                                LAN
                            </div>

                        </div>


                        <div class="feature-divider"></div>


                        <div class="feature-item">

                            <div class="feature-icon">
                                ${phonecastGlyph("lock", 22)}
                            </div>

                            <div class="feature-title">
                                PRIVATE
                            </div>

                            <div class="feature-subtitle">
                                LOCAL
                            </div>

                        </div>


                        <div class="feature-divider"></div>


                        <div class="feature-item">

                            <div class="feature-icon">
                                ${phonecastGlyph("shield", 22)}
                            </div>

                            <div class="feature-title">
                                SECURE
                            </div>

                            <div class="feature-subtitle">
                                AUTHENTICATED
                            </div>

                        </div>

                    </div>


                    <button
                        id="welcomeStartButton"
                        class="primary-button welcome-button"
                    >
                        GET STARTED

                        <span>
                            ${phonecastGlyph("arrow", 17)}
                        </span>
                    </button>

                </div>


                <div class="welcome-visual"></div>

            </div>

        </div>
    `;


    document
        .getElementById(
            "welcomeStartButton"
        )
        ?.addEventListener(
            "click",
            () => {

                if (
                    state.account &&
                    state.account.accountCreated
                ) {

                    navigate(
                        "home"
                    );

                } else {

                    navigate(
                        "name"
                    );
                }
            }
        );
}


// ============================================================
// SETUP PROGRESS
// ============================================================

function setupProgress(
    active
) {

    const current =
        Number(active) || 1;


    return `

        <div class="setup-progress">

            <div class="
                setup-step
                ${current >= 1 ? "active" : ""}
            ">
                <span>1</span>
                <label>Name</label>
            </div>


            <div class="setup-line"></div>


            <div class="
                setup-step
                ${current >= 2 ? "active" : ""}
            ">
                <span>2</span>
                <label>Password</label>
            </div>


            <div class="setup-line"></div>


            <div class="
                setup-step
                ${current >= 3 ? "active" : ""}
            ">
                <span>3</span>
                <label>Ready</label>
            </div>

        </div>
    `;
}


// ============================================================
// NAME PAGE
// ============================================================

export function showNamePage() {

    if (!ensureApp()) {
        return;
    }


    state.currentPage =
        "name";


    app.innerHTML = `

        <div class="page-shell setup-page">

            ${setupProgress(1)}


            <button
                id="nameBack"
                class="back-button"
            >
                ←
            </button>


            <main class="setup-card">

                <div class="setup-icon">
                    ▣
                </div>


                <div class="setup-label">
                    LAPTOP SETUP
                </div>


                <h1>
                    Set Your
                    <span>Laptop Name</span>
                </h1>


                <p>
                    This name will be shown on your
                    phone when a connection request
                    is sent.
                </p>


                <div class="input-group">

                    <label>
                        LAPTOP NAME
                    </label>

                    <input
                        id="laptopName"
                        type="text"
                        maxlength="40"
                        autocomplete="off"
                        placeholder="Example: Yash-PC"
                    >

                </div>


                <div
                    id="nameError"
                    class="form-error hidden"
                ></div>


                <button
                    id="nameContinue"
                    class="primary-button"
                >
                    CONTINUE
                    <span>→</span>
                </button>

            </main>

        </div>
    `;


    const input =
        document.getElementById(
            "laptopName"
        );


    if (
        state.account?.laptopName
    ) {

        input.value =
            state.account.laptopName;
    }


    document
        .getElementById(
            "nameBack"
        )
        ?.addEventListener(
            "click",
            () =>
                navigate(
                    "welcome"
                )
        );


    const continueName =
        () => {

            const value =
                String(
                    input?.value || ""
                ).trim();


            const error =
                document.getElementById(
                    "nameError"
                );


            if (
                value.length < 2
            ) {

                showError(
                    error,
                    "Please enter a valid laptop name."
                );

                input?.focus();

                return;
            }


            if (
                value.length > 40
            ) {

                showError(
                    error,
                    "Laptop name must be 40 characters or less."
                );

                input?.focus();

                return;
            }


            state.account = {
                ...(state.account || {}),
                laptopName: value
            };


            navigate(
                "password",
                {
                    laptopName: value
                }
            );
        };


    document
        .getElementById(
            "nameContinue"
        )
        ?.addEventListener(
            "click",
            continueName
        );


    input?.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                continueName();
            }
        }
    );
}


// ============================================================
// PASSWORD PAGE
// ============================================================

export function showPasswordPage(
    data
) {

    if (!ensureApp()) {
        return;
    }


    /*
     * navigation.js may pass either:
     *
     * { laptopName: "Yash-PC" }
     *
     * or the name directly.
     */

    const laptopName =
        typeof data ===
        "string"
            ? data
            : data?.laptopName ||
              state.account?.laptopName ||
              "";


    if (
        !laptopName
    ) {

        console.warn(
            "[PhoneCast Pages] Laptop name missing on password page."
        );

        navigate(
            "name"
        );

        return;
    }


    state.currentPage =
        "password";


    app.innerHTML = `

        <div class="page-shell setup-page">

            ${setupProgress(2)}


            <button
                id="passwordBack"
                class="back-button"
            >
                ←
            </button>


            <main class="setup-card">

                <div class="setup-icon">
                    ◈
                </div>


                <div class="setup-label">
                    SECURITY
                </div>


                <h1>
                    Secure Your
                    <span>PhoneCast</span>
                </h1>


                <p>
                    Create a local password for this
                    laptop account.
                </p>


                <div class="input-group">

                    <label>
                        PASSWORD
                    </label>

                    <input
                        id="password"
                        type="password"
                        maxlength="100"
                        autocomplete="new-password"
                        placeholder="Enter password"
                    >

                </div>


                <div class="password-rules">

                    <div id="ruleLength">
                        ○ At least 8 characters
                    </div>

                    <div id="ruleStart">
                        ○ Starts with a letter
                    </div>

                    <div id="ruleCharacters">
                        ○ Letters, numbers and underscore
                    </div>

                </div>


                <div class="input-group">

                    <label>
                        CONFIRM PASSWORD
                    </label>

                    <input
                        id="confirmPassword"
                        type="password"
                        maxlength="100"
                        autocomplete="new-password"
                        placeholder="Re-enter password"
                    >

                </div>


                <div
                    id="passwordError"
                    class="form-error hidden"
                ></div>


                <button
                    id="createAccount"
                    class="primary-button"
                >
                    CREATE ACCOUNT
                    <span>→</span>
                </button>

            </main>

        </div>
    `;


    state.account = {
        ...(state.account || {}),
        laptopName
    };


    const password =
        document.getElementById(
            "password"
        );


    const confirmPassword =
        document.getElementById(
            "confirmPassword"
        );


    password?.addEventListener(
        "input",
        () => {

            updatePasswordRules(
                password.value
            );
        }
    );


    document
        .getElementById(
            "passwordBack"
        )
        ?.addEventListener(
            "click",
            () =>
                navigate(
                    "name"
                )
        );


    const create =
        async () => {

            const value =
                String(
                    password?.value || ""
                );


            const confirm =
                String(
                    confirmPassword?.value || ""
                );


            const error =
                document.getElementById(
                    "passwordError"
                );


            const validation =
                validatePassword(
                    value
                );


            if (
                !validation.valid
            ) {

                showError(
                    error,
                    validation.message
                );

                password?.focus();

                return;
            }


            if (
                value !==
                confirm
            ) {

                showError(
                    error,
                    "Passwords do not match."
                );

                confirmPassword?.focus();

                return;
            }


            const button =
                document.getElementById(
                    "createAccount"
                );


            if (button) {

                button.disabled =
                    true;

                button.textContent =
                    "CREATING...";
            }


            try {

                const result =
                    await createAccount(
                        laptopName,
                        value
                    );


                if (
                    !result ||
                    result.success === false
                ) {

                    throw new Error(
                        result?.error ||
                        "Unable to create account."
                    );
                }


                state.account = {
                    ...(state.account || {}),
                    laptopName,
                    accountCreated:
                        true
                };


                navigate(
                    "home"
                );

            } catch (
                errorObject
            ) {

                console.error(
                    "[PhoneCast Pages] Account creation failed:",
                    errorObject
                );


                showError(
                    error,
                    getErrorMessage(
                        errorObject,
                        "Unable to create account."
                    )
                );


                if (button) {

                    button.disabled =
                        false;

                    button.innerHTML =
                        `CREATE ACCOUNT <span>→</span>`;
                }
            }
        };


    document
        .getElementById(
            "createAccount"
        )
        ?.addEventListener(
            "click",
            create
        );


    confirmPassword?.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                create();
            }
        }
    );
}


// ============================================================
// PASSWORD VALIDATION
// ============================================================

function validatePassword(
    value
) {

    if (
        value.length < 8
    ) {

        return {
            valid: false,
            message:
                "Password must contain at least 8 characters."
        };
    }


    if (
        !/^[A-Za-z]/.test(
            value
        )
    ) {

        return {
            valid: false,
            message:
                "Password must start with a letter."
        };
    }


    if (
        !/^[A-Za-z0-9_]+$/.test(
            value
        )
    ) {

        return {
            valid: false,
            message:
                "Only letters, numbers and underscore are allowed."
        };
    }


    return {
        valid: true,
        message: ""
    };
}


// ============================================================
// PASSWORD RULES
// ============================================================

function updatePasswordRules(
    value
) {

    const length =
        document.getElementById(
            "ruleLength"
        );


    const start =
        document.getElementById(
            "ruleStart"
        );


    const chars =
        document.getElementById(
            "ruleCharacters"
        );


    const lengthValid =
        value.length >= 8;


    const startValid =
        /^[A-Za-z]/.test(
            value
        );


    const charactersValid =
        value.length > 0 &&
        /^[A-Za-z0-9_]+$/.test(
            value
        );


    if (length) {

        length.textContent =
            `${lengthValid ? "✓" : "○"} At least 8 characters`;

        length.classList.toggle(
            "valid",
            lengthValid
        );
    }


    if (start) {

        start.textContent =
            `${startValid ? "✓" : "○"} Starts with a letter`;

        start.classList.toggle(
            "valid",
            startValid
        );
    }


    if (chars) {

        chars.textContent =
            `${charactersValid ? "✓" : "○"} Letters, numbers and underscore`;

        chars.classList.toggle(
            "valid",
            charactersValid
        );
    }
}


// ============================================================
// HOME
// ============================================================

export function showHomePage() {

    if (!ensureApp()) {
        return;
    }


    state.currentPage =
        "home";


    app.innerHTML = `

        <div class="home-shell">

            <aside class="sidebar">

                <div class="sidebar-brand">

                    <img
                        src="./assets/phonecast-mark.svg"
                        alt="PhoneCast"
                    >

                    <span>
                        PhoneCast
                    </span>

                </div>


                <nav>

                    <button
                        class="sidebar-item active"
                        data-page="home"
                    >
                        <span>${phonecastGlyph("home", 18)}</span>
                        Home
                    </button>


                    <button
                        class="sidebar-item"
                        data-page="history"
                    >
                        <span>${phonecastGlyph("history", 18)}</span>
                        History
                    </button>


                    <button
                        class="sidebar-item"
                        data-page="settings"
                    >
                        <span>${phonecastGlyph("settings", 18)}</span>
                        Settings
                    </button>

                </nav>


                <div class="sidebar-bottom">

                    <div class="connection-pill">

                        <span></span>

                        LOCAL LAN

                    </div>

                </div>

            </aside>


            <main class="home-main">

                <header class="dashboard-header">

                    <div>

                        <div class="eyebrow">
                            PHONECAST DASHBOARD
                        </div>

                        <h1>
                            Hello,
                            <span>
                                ${escapeHtml(
                                    state.account?.laptopName ||
                                    "PhoneCast-PC"
                                )}
                            </span>
                        </h1>

                        <p>
                            Connect to your phone and
                            share its screen wirelessly.
                        </p>

                    </div>


                    <div class="ready-indicator">

                        <span></span>

                        READY

                    </div>

                </header>

                <div class="dashboard-hero-art" aria-hidden="true">

                    <img
                        src="./assets/laptop.png"
                        alt=""
                    >

                    <div>
                        <span>WIRELESS SCREEN SHARING</span>
                        <strong>Ready when you are.</strong>
                    </div>

                </div>


                <section class="dashboard-grid">

                    <div class="panel devices-panel">

                        <div class="panel-header">

                            <div>

                                <div class="eyebrow">
                                    CONNECTION
                                </div>

                                <h2>
                                    Available Devices
                                </h2>

                            </div>


                            <button
                                id="refreshDevices"
                                class="icon-button"
                                title="Search for devices"
                                ${state.searching ? "disabled" : ""}
                            >
                                ${phonecastGlyph("refresh", 17)}
                            </button>

                        </div>


                        <button
                            id="searchDevices"
                            class="primary-button search-button"
                            ${state.searching ? "disabled" : ""}
                        >

                            ${
                                state.searching
                                    ? "SEARCHING..."
                                    : "SEARCH DEVICES"
                            }

                        </button>


                        <div
                            id="devicesList"
                            class="devices-list"
                        >

                            ${renderDevices()}

                        </div>


                        <div
                            id="connectionStatus"
                            class="connection-status"
                        >
                            ${escapeHtml(
                                state.connectionStatus ||
                                "Ready"
                            )}
                        </div>

                    </div>


                    <div class="panel history-panel">

                        <div class="panel-header">

                            <div>

                                <div class="eyebrow">
                                    ACTIVITY
                                </div>

                                <h2>
                                    Connection History
                                </h2>

                            </div>


                            <button
                                id="seeHistory"
                                class="text-button"
                            >
                                SEE ALL
                            </button>

                        </div>


                        <div class="history-list">

                            ${renderHistory()}

                        </div>

                    </div>

                </section>

            </main>

        </div>
    `;


    setupHomeEvents();


    /*
     * History refresh is intentionally non-blocking.
     * The home page should remain usable even if the
     * history API is unavailable.
     */

    refreshHistorySafely();
}


// ============================================================
// DEVICE LIST
// ============================================================

function renderDevices() {

    if (
        !Array.isArray(
            state.devices
        ) ||
        state.devices.length === 0
    ) {

        return `

            <div class="empty-state">

                <img
                    src="./assets/requests.png"
                    alt=""
                >

                <strong>
                    ${
                        state.searching
                            ? "Searching for devices..."
                            : "No devices found"
                    }
                </strong>

                <span>
                    ${
                        state.searching
                            ? "Searching your local network for PhoneCast devices."
                            : "Search your local network for available PhoneCast devices."
                    }
                </span>

            </div>
        `;
    }


    return state.devices
        .map(
            (
                device,
                index
            ) => {

                const displayName =
                    getDeviceDisplayName(
                        device
                    ) ||
                    device?.name ||
                    `Phone ${index + 1}`;


                const model =
                    device?.model ||
                    "Android Device";


                const selected =
                    state.selectedDevice?.id ===
                    device?.id;


                return `

                    <button
                        type="button"
                        class="
                            device-card
                            ${selected ? "selected" : ""}
                        "
                        data-device-index="${index}"
                    >

                        <div class="device-icon">

                            <img
                                src="./assets/phonecast-mark.svg"
                                alt=""
                            >

                        </div>


                        <div class="device-info">

                            <strong>
                                ${escapeHtml(
                                    displayName
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    model
                                )}
                            </span>

                        </div>


                        <span class="online-dot"></span>

                    </button>
                `;
            }
        )
        .join("");
}


// ============================================================
// HISTORY
// ============================================================

function renderHistory() {

    if (
        !Array.isArray(
            state.connectionHistory
        ) ||
        state.connectionHistory.length === 0
    ) {

        return `

            <div class="empty-history">

                <span>
                    ${phonecastGlyph("history", 22)}
                </span>

                <strong>
                    No connections yet
                </strong>

                <small>
                    Your connection history
                    will appear here.
                </small>

            </div>
        `;
    }


    return state.connectionHistory
        .slice(
            0,
            6
        )
        .map(
            entry => {

                const deviceName =
                    entry?.deviceName ||
                    entry?.phoneName ||
                    entry?.name ||
                    "Android Phone";


                const timestamp =
                    entry?.timestamp ||
                    entry?.connectedAt ||
                    entry?.date;


                const status =
                    entry?.status ||
                    "Connected";


                const rejected =
                    String(
                        status
                    )
                        .toLowerCase()
                        .includes(
                            "reject"
                        );


                return `

                    <div class="history-item">

                        <div class="history-device">

                            <img
                                src="./assets/phonecast-mark.svg"
                                alt=""
                            >

                        </div>


                        <div class="history-info">

                            <strong>
                                ${escapeHtml(
                                    deviceName
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    formatDate(
                                        timestamp
                                    )
                                )}
                            </span>

                        </div>


                        <div class="
                            history-status
                            ${rejected ? "rejected" : ""}
                        ">

                            <span></span>

                            ${escapeHtml(
                                status
                            )}

                        </div>

                    </div>
                `;
            }
        )
        .join("");
}


// ============================================================
// HOME EVENTS
// ============================================================

function setupHomeEvents() {

    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const page =
                            button.dataset.page;

                        if (
                            page
                        ) {

                            navigate(
                                page
                            );
                        }
                    }
                );
            }
        );


    document
        .getElementById(
            "searchDevices"
        )
        ?.addEventListener(
            "click",
            performSearch
        );


    document
        .getElementById(
            "refreshDevices"
        )
        ?.addEventListener(
            "click",
            performSearch
        );


    document
        .getElementById(
            "seeHistory"
        )
        ?.addEventListener(
            "click",
            () =>
                navigate(
                    "history"
                )
        );


    document
        .querySelectorAll(
            ".device-card"
        )
        .forEach(
            card => {

                card.addEventListener(
                    "click",
                    () => {

                        const index =
                            Number(
                                card.dataset.deviceIndex
                            );


                        const device =
                            state.devices[
                                index
                            ];


                        if (
                            !device
                        ) {
                            return;
                        }


                        handleDeviceConnection(
                            device
                        );
                    }
                );
            }
        );
}


// ============================================================
// SEARCH DEVICES
// ============================================================

async function performSearch() {

    if (
        state.searching
    ) {
        return;
    }


    if (
        !window.phoneCast
    ) {

        state.searching =
            false;

        state.connectionStatus =
            "PhoneCast API unavailable.";

        navigate(
            "home"
        );

        return;
    }


    state.devices =
        [];


    state.selectedDevice =
        null;


    state.searching =
        true;


    state.connectionStatus =
        "Searching for devices...";


    /*
     * Render immediately so the user sees SEARCHING...
     * before the IPC/mDNS operation begins.
     */

    navigate(
        "home"
    );


    try {

        /*
         * IMPORTANT:
         *
         * beginDeviceDiscovery() starts the discovery
         * watchdog and then calls the desktop IPC API.
         *
         * We do NOT treat the returned Promise as the
         * completion of mDNS discovery.
         */

        const started =
            await beginDeviceDiscovery();


        if (
            started === false
        ) {

            return;
        }

    } catch (
        error
    ) {

        console.error(
            "[PhoneCast Pages] Device search failed:",
            error
        );


        state.searching =
            false;

        state.connectionStatus =
            getErrorMessage(
                error,
                "Device search failed."
            );


        navigate(
            "home"
        );
    }
}


// ============================================================
// CONNECT TO DEVICE
// ============================================================

async function handleDeviceConnection(
    device
) {

    if (
        !device
    ) {
        return;
    }


    if (
        state.connecting
    ) {
        return;
    }


    state.selectedDevice =
        device;


    state.connectionStatus =
        "Connecting...";


    navigate(
        "home"
    );


    try {

        const result =
            await connectToDevice(
                device
            );


        if (
            result &&
            result.success === false
        ) {

            throw new Error(
                result.error ||
                "Connection request failed."
            );
        }


        /*
         * The actual connection flow continues
         * through connection-event messages handled
         * by events.js.
         */

    } catch (
        error
    ) {

        console.error(
            "[PhoneCast Pages] Connection failed:",
            error
        );


        state.connecting =
            false;

        state.connectionStatus =
            getErrorMessage(
                error,
                "Connection failed."
            );


        navigate(
            "home"
        );
    }
}


// ============================================================
// HISTORY PAGE
// ============================================================

export function showHistoryPage() {

    if (!ensureApp()) {
        return;
    }


    state.currentPage =
        "history";


    app.innerHTML = `

        <div class="home-shell">

            ${renderSidebar("history")}


            <main class="home-main">

                <header class="dashboard-header">

                    <div>

                        <div class="eyebrow">
                            ACTIVITY
                        </div>

                        <h1>
                            Connection
                            <span>History</span>
                        </h1>

                        <p>
                            Previous PhoneCast sessions.
                        </p>

                    </div>

                </header>


                <section class="panel full-panel">

                    <div class="panel-header">

                        <h2>
                            Recent Connections
                        </h2>

                    </div>


                    <div class="history-list large">

                        ${renderHistory()}

                    </div>

                </section>

            </main>

        </div>
    `;


    setupSidebarNavigation();


    refreshHistorySafely();
}


// ============================================================
// SETTINGS PAGE
// ============================================================

export function showSettingsPage() {

    if (!ensureApp()) {
        return;
    }


    state.currentPage =
        "settings";


    app.innerHTML = `

        <div class="home-shell">

            ${renderSidebar("settings")}


            <main class="home-main">

                <header class="dashboard-header">

                    <div>

                        <div class="eyebrow">
                            CONFIGURATION
                        </div>

                        <h1>
                            PhoneCast
                            <span>Settings</span>
                        </h1>

                        <p>
                            Local desktop configuration.
                        </p>

                    </div>

                </header>


                <section class="settings-grid">

                    <div class="panel setting-card">

                        <div class="setting-icon">
                            ${phonecastGlyph("screen", 22)}
                        </div>

                        <div>

                            <div class="eyebrow">
                                LAPTOP
                            </div>

                            <h2>
                                ${escapeHtml(
                                    state.account?.laptopName ||
                                    "PhoneCast-PC"
                                )}
                            </h2>

                            <p>
                                This is the name shown
                                to your phone.
                            </p>

                        </div>

                    </div>


                    <div class="panel setting-card">

                        <div class="setting-icon">
                            ${phonecastGlyph("wifi", 22)}
                        </div>

                        <div>

                            <div class="eyebrow">
                                NETWORK
                            </div>

                            <h2>
                                Local LAN
                            </h2>

                            <p>
                                PhoneCast communicates
                                directly over your network.
                            </p>

                        </div>

                    </div>


                    <div class="panel setting-card">

                        <div class="setting-icon">
                            ${phonecastGlyph("shield", 22)}
                        </div>

                        <div>

                            <div class="eyebrow">
                                SECURITY
                            </div>

                            <h2>
                                Authenticated
                            </h2>

                            <p>
                                Phone connections require
                                phone-side authentication.
                            </p>

                        </div>

                    </div>

                </section>

            </main>

        </div>
    `;


    setupSidebarNavigation();
}


// ============================================================
// SIDEBAR
// ============================================================

function renderSidebar(
    active
) {

    return `

        <aside class="sidebar">

            <div class="sidebar-brand">

                <img
                    src="./assets/phonecast-mark.svg"
                    alt="PhoneCast"
                >

                <span>
                    PhoneCast
                </span>

            </div>


            <nav>

                <button
                    type="button"
                    class="
                        sidebar-item
                        ${active === "home" ? "active" : ""}
                    "
                    data-page="home"
                >
                    <span>${phonecastGlyph("home", 18)}</span>
                    Home
                </button>


                <button
                    type="button"
                    class="
                        sidebar-item
                        ${active === "history" ? "active" : ""}
                    "
                    data-page="history"
                >
                    <span>${phonecastGlyph("history", 18)}</span>
                    History
                </button>


                <button
                    type="button"
                    class="
                        sidebar-item
                        ${active === "settings" ? "active" : ""}
                    "
                    data-page="settings"
                >
                    <span>${phonecastGlyph("settings", 18)}</span>
                    Settings
                </button>

            </nav>

        </aside>
    `;
}


// ============================================================
// SIDEBAR EVENTS
// ============================================================

function setupSidebarNavigation() {

    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const page =
                            button.dataset.page;

                        if (
                            page
                        ) {

                            navigate(
                                page
                            );
                        }
                    }
                );
            }
        );
}


// ============================================================
// CASTING PAGE
// ============================================================


let activePhonecastWorkspace = "calls";
let activePhonecastCallView = "dialpad";
let phonecastDialNumber = "";
let phonecastWorkspaceNotice = "";
let phonecastSettingsQuery = "";
let phonecastMessageQuery = "";
let phonecastMessageFilter = "all";
let activePhonecastMessageKey = "";
let phonecastNotificationListenerRegistered = false;

/* Inline SVG glyphs keep the desktop app dependency-free. */
function phonecastGlyph(name, size = 18) {
    const paths = {
        call: "<path d='M21 16.4v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 10.2 18a19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 1.9 3.2 2 2 0 0 1 3.9 1h3a2 2 0 0 1 2 1.7l.5 2.8a2 2 0 0 1-.6 1.8L7 9a16 16 0 0 0 6 6l1.7-1.8a2 2 0 0 1 1.8-.6l2.8.5a2 2 0 0 1 1.7 2Z'/>",
        messages: "<path d='M21 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 3v-6.5A7.5 7.5 0 1 1 21 11.5Z'/><path d='M8 10h8M8 13.5h5'/>",
        sparkles: "<path d='m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z'/><path d='m19 15 .9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9L19 15Z'/>",
        settings: "<path d='M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z'/><path d='m19.4 15 .1.1 1.4 1.1-1.8 3.1-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-3.6l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.8-3.1 1.4-1.1a8 8 0 0 1 0-2L6.3 12l1.8-3.1 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h3.6l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.8 3.1-1.4 1.1a8 8 0 0 1-.1 2Z'/>",
        search: "<circle cx='10.5' cy='10.5' r='6.5'/><path d='m16 16 5 5'/>",
        phone: "<rect x='5' y='2' width='14' height='20' rx='2.5'/><path d='M10 18h4'/>",
        screen: "<rect x='2' y='3' width='20' height='14' rx='2'/><path d='M8 21h8M12 17v4'/>",
        wifi: "<path d='M2 8.5a15.5 15.5 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a4.7 4.7 0 0 1 6 0M12 19h.01'/>",
        history: "<path d='M3 12a9 9 0 1 0 2.6-6.4L3 8'/><path d='M3 3v5h5M12 7v5l3 2'/>",
        touch: "<path d='M8 11V5a2 2 0 0 1 4 0v5-2a2 2 0 0 1 4 0v3-1a2 2 0 0 1 4 0v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-4-1.5L5 16a2 2 0 0 1 3-2l2 2'/>",
        bell: "<path d='M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4'/>",
        back: "<path d='m15 18-6-6 6-6'/>",
        home: "<path d='m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z'/>",
        recents: "<rect x='4' y='4' width='16' height='16' rx='3'/>",
        shield: "<path d='M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z'/><path d='m9 12 2 2 4-4'/>",
        battery: "<rect x='2' y='7' width='18' height='10' rx='2'/><path d='M22 10v4M6 10h7'/>",
        sun: "<circle cx='12' cy='12' r='4'/><path d='M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41'/>",
        location: "<path d='M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z'/><circle cx='12' cy='10' r='2.5'/>",
        apps: "<rect x='3' y='3' width='7' height='7' rx='1.5'/><rect x='14' y='3' width='7' height='7' rx='1.5'/><rect x='3' y='14' width='7' height='7' rx='1.5'/><rect x='14' y='14' width='7' height='7' rx='1.5'/>",
        volume: "<path d='M4 10v4h4l5 4V6l-5 4H4Z'/><path d='M16 9a5 5 0 0 1 0 6M18.5 6.5a9 9 0 0 1 0 11'/>",
        lock: "<rect x='4' y='10' width='16' height='12' rx='2'/><path d='M8 10V7a4 4 0 0 1 8 0v3M12 14v4'/>",
        arrow: "<path d='m9 18 6-6-6-6'/>",
        refresh: "<path d='M20 7v5h-5'/><path d='M4.9 9a7.5 7.5 0 0 1 12.4-2.8L20 12M4 17v-5h5'/><path d='M19.1 15a7.5 7.5 0 0 1-12.4 2.8L4 12'/>",
        person: "<circle cx='12' cy='8' r='4'/><path d='M4 21a8 8 0 0 1 16 0'/>"
    };
    return "<svg class='phonecast-glyph' width='" + size + "' height='" + size +
        "' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' " +
        "stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>" +
        (paths[name] || paths.sparkles) + "</svg>";
}

const PHONECAST_SETTINGS_ITEMS = [
    { icon: "wifi", title: "Network & internet", detail: "Wi-Fi, mobile network, hotspot", action: "OPEN_SETTINGS_NETWORK" },
    { icon: "screen", title: "Connected devices", detail: "Bluetooth, pairing and USB", action: "OPEN_SETTINGS_CONNECTED_DEVICES" },
    { icon: "apps", title: "Apps", detail: "Installed apps and permissions", action: "OPEN_SETTINGS_APPS" },
    { icon: "bell", title: "Notifications", detail: "Notification access and alerts", action: "OPEN_NOTIFICATION_ACCESS_SETTINGS" },
    { icon: "battery", title: "Battery", detail: "Battery use and power settings", action: "OPEN_SETTINGS_BATTERY" },
    { icon: "sun", title: "Display", detail: "Brightness, refresh rate and theme", action: "OPEN_SETTINGS_DISPLAY" },
    { icon: "volume", title: "Sound & vibration", detail: "Volume, ringtones and vibration", action: "OPEN_SETTINGS_SOUND" },
    { icon: "shield", title: "Privacy", detail: "Permissions and privacy controls", action: "OPEN_SETTINGS_PRIVACY" },
    { icon: "location", title: "Location", detail: "Location services and access", action: "OPEN_SETTINGS_LOCATION" },
    { icon: "lock", title: "Security", detail: "Screen lock and device security", action: "OPEN_SETTINGS_SECURITY" },
    { icon: "settings", title: "System", detail: "Language, keyboard and updates", action: "OPEN_SETTINGS_SYSTEM" },
    { icon: "phone", title: "About phone", detail: "Device model and software information", action: "OPEN_SETTINGS_ABOUT" }
];

function renderPhonecastCallsWorkspace() {
    var tabs = [
        { id: "dialpad", label: "DIAL PAD" },
        { id: "recent", label: "RECENT CALLS" },
        { id: "contacts", label: "CONTACTS" }
    ];

    var tabsHtml = tabs.map(function (tab) {
        var selected = activePhonecastCallView === tab.id;
        return "<button type='button' class='workspace-subtab" +
            (selected ? " active" : "") +
            "' data-phonecast-call-view='" + tab.id +
            "' aria-pressed='" + String(selected) + "'>" +
            tab.label + "</button>";
    }).join("");

    var callContent = "";

    if (activePhonecastCallView === "dialpad") {
        var sanitizedNumber = phonecastDialNumber.replace(/[^0-9+*#(), -]/g, "");
        var digits = [
            ["1", ""], ["2", "ABC"], ["3", "DEF"],
            ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
            ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
            ["*", ""], ["0", "+"], ["#", ""]
        ];

        var digitButtons = digits.map(function (item) {
            return "<button type='button' class='dialpad-key' data-dial-digit='" +
                item[0] + "'><strong>" + item[0] + "</strong>" +
                (item[1] ? "<span>" + item[1] + "</span>" : "") +
                "</button>";
        }).join("");

        callContent = [
            "<div class='calls-layout'>",
            "<section class='workspace-card dialer-card'>",
            "<div class='workspace-card-heading'><div><span class='workspace-eyebrow'>PHONE</span><h3>Dial a number</h3></div><span class='integration-pill pending'>PHONE LINK</span></div>",
            "<label class='dial-number-label' for='phonecastDialNumber'>Phone number</label>",
            "<input id='phonecastDialNumber' class='workspace-input dial-number-input' type='tel' inputmode='tel' autocomplete='off' placeholder='Enter a phone number' value='" + escapeHtml(sanitizedNumber) + "' aria-label='Phone number to dial'>",
            "<div class='phonecast-dialpad' role='group' aria-label='Dial pad'>" + digitButtons + "</div>",
            "<div class='dialer-actions'>",
            "<button type='button' class='workspace-secondary-button' data-dial-action='clear'>CLEAR</button>",
            "<button type='button' class='workspace-secondary-button' data-dial-action='backspace' aria-label='Delete last digit'>⌫</button>",
            "<button type='button' class='workspace-primary-button call-action-button' data-dial-action='call'><span aria-hidden='true'>" + phonecastGlyph("call", 16) + "</span> CALL</button>",
            "</div>",
            "<p class='workspace-inline-status " + (phonecastWorkspaceNotice ? "" : "hidden") + "' id='phonecastCallNotice' role='status'>" + escapeHtml(phonecastWorkspaceNotice) + "</p>",
            "</section>",
            "<section class='workspace-card call-side-card'><div class='workspace-card-heading'><div><span class='workspace-eyebrow'>CALLING</span><h3>From PhoneCast</h3></div></div>",
            "<div class='workspace-empty-state compact-empty-state'><div class='workspace-empty-icon' aria-hidden='true'>" + phonecastGlyph("call", 24) + "</div><strong>Calls use your connected phone</strong><p>Dialer launching is the first calling integration. Call history, saved contacts and in-call audio controls will be connected in subsequent steps.</p></div>",
            "<div class='workspace-feature-row'><span class='feature-status-dot'></span><span>Calls use your phone's SIM and carrier.</span></div></section></div>"
        ].join("");
    } else if (activePhonecastCallView === "recent") {
        callContent = [
            "<section class='workspace-card workspace-full-card'>",
            "<div class='workspace-card-heading'><div><span class='workspace-eyebrow'>CALL ACTIVITY</span><h3>Recent calls</h3></div><span class='integration-pill pending'>INTEGRATION REQUIRED</span></div>",
            "<div class='workspace-empty-state'><div class='workspace-empty-icon' aria-hidden='true'>" + phonecastGlyph("history", 24) + "</div><strong>Call history hasn't synced yet</strong><p>PhoneCast needs Android call-log access before it can show real recent calls here. No sample history is being presented as real data.</p></div>",
            "</section>"
        ].join("");
    } else {
        callContent = [
            "<section class='workspace-card workspace-full-card'>",
            "<div class='workspace-card-heading'><div><span class='workspace-eyebrow'>PEOPLE</span><h3>Phone contacts</h3></div><span class='integration-pill pending'>INTEGRATION REQUIRED</span></div>",
            "<input id='phonecastContactSearch' class='workspace-input' type='search' placeholder='Search saved phone contacts...' autocomplete='off'>",
            "<div class='workspace-empty-state'><div class='workspace-empty-icon' aria-hidden='true'>" + phonecastGlyph("person", 24) + "</div><strong>Contact directory isn't connected yet</strong><p>The Android integration will request Contacts permission and load real contacts from your phone.</p></div>",
            "</section>"
        ].join("");
    }

    return [
        "<div class='workspace-view calls-workspace'>",
        "<header class='workspace-view-header'><div><span class='workspace-eyebrow'>PHONE CONTROL CENTRE</span><h2>Calls</h2><p>Dial, review call activity and find saved contacts.</p></div><div class='workspace-header-icon call-icon' aria-hidden='true'>" + phonecastGlyph("call", 24) + "</div></header>",
        "<div class='workspace-subtabs' role='tablist' aria-label='Calling sections'>" + tabsHtml + "</div>",
        "<div class='workspace-view-body'>" + callContent + "</div>",
        "</div>"
    ].join("");
}


function getPhonecastNotificationCategory(notification) {
    var appName = String(notification.appName || "").toLowerCase();
    var packageName = String(notification.packageName || "").toLowerCase();

    if (packageName.includes("whatsapp") || appName.includes("whatsapp")) {
        return "whatsapp";
    }

    if (packageName.includes("instagram") || appName.includes("instagram")) {
        return "instagram";
    }

    if (
        packageName.includes("messaging") ||
        packageName.includes("mms") ||
        packageName.includes("sms") ||
        appName === "messages" ||
        appName.includes("sms") ||
        appName.includes("message")
    ) {
        return "sms";
    }

    return "other";
}

function formatPhonecastNotificationTime(timestamp) {
    var value = Number(timestamp);
    if (!Number.isFinite(value) || value <= 0) {
        return "";
    }

    try {
        var date = new Date(value);
        var today = new Date();
        if (
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate()
        ) {
            return date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });
        }

        return date.toLocaleDateString([], {
            day: "numeric",
            month: "short"
        });
    } catch (_) {
        return "";
    }
}

function renderPhonecastMessagesWorkspace() {
    var query = phonecastMessageQuery.trim().toLowerCase();
    var allNotifications = Array.isArray(state.notifications)
        ? state.notifications
        : [];

    var filteredNotifications = allNotifications.filter(function (item) {
        var category = getPhonecastNotificationCategory(item);
        var matchesFilter =
            phonecastMessageFilter === "all" ||
            category === phonecastMessageFilter;

        var searchableText = [
            item.appName,
            item.packageName,
            item.title,
            item.text
        ].join(" ").toLowerCase();

        return matchesFilter && (!query || searchableText.includes(query));
    });

    if (
        !activePhonecastMessageKey ||
        !filteredNotifications.some(function (item) {
            return String(item.key) === activePhonecastMessageKey;
        })
    ) {
        activePhonecastMessageKey = filteredNotifications.length
            ? String(filteredNotifications[0].key)
            : "";
    }

    var selectedNotification = filteredNotifications.find(function (item) {
        return String(item.key) === activePhonecastMessageKey;
    }) || null;

    var filters = [
        { id: "all", label: "ALL" },
        { id: "whatsapp", label: "WHATSAPP" },
        { id: "instagram", label: "INSTAGRAM" },
        { id: "sms", label: "SMS" },
        { id: "other", label: "OTHERS" }
    ];

    var filtersHtml = filters.map(function (filter) {
        var selected = phonecastMessageFilter === filter.id;
        return "<button type='button' class='message-filter-chip" +
            (selected ? " active" : "") +
            "' data-message-filter='" + filter.id +
            "' aria-pressed='" + String(selected) + "'>" +
            filter.label + "</button>";
    }).join("");

    var notificationListHtml = "";

    if (filteredNotifications.length) {
        notificationListHtml = filteredNotifications.map(function (item) {
            var key = String(item.key);
            var encodedKey = encodeURIComponent(key);
            var selected = key === activePhonecastMessageKey;
            var appName = escapeHtml(item.appName || "App notification");
            var title = escapeHtml(item.title || item.appName || "Notification");
            var body = escapeHtml(item.text || "No preview text available.");
            var time = escapeHtml(formatPhonecastNotificationTime(item.postTime));
            var replyLabel = item.hasReplyAction ? "REPLY SUPPORTED" : "NOTIFICATION";

            return [
                "<button type='button' class='phonecast-notification-row" + (selected ? " active" : "") + "' data-notification-select='" + encodedKey + "' aria-pressed='" + String(selected) + "'>",
                "<span class='notification-app-mark'>" + escapeHtml((item.appName || "A").trim().slice(0, 1).toUpperCase()) + "</span>",
                "<span class='notification-row-copy'><span class='notification-row-top'><strong>" + appName + "</strong><time>" + time + "</time></span>",
                "<strong class='notification-row-title'>" + title + "</strong><span class='notification-row-preview'>" + body + "</span><small>" + replyLabel + "</small></span>",
                "</button>"
            ].join("");
        }).join("");
    } else {
        notificationListHtml = [
            "<div class='workspace-empty-state notification-empty-state'>",
            "<div class='workspace-empty-icon' aria-hidden='true'>" + phonecastGlyph("messages", 24) + "</div>",
            "<strong>" + (allNotifications.length ? "No matching notifications" : "Waiting for phone notifications") + "</strong>",
            "<p>" + (allNotifications.length
                ? "Try another search term or app filter."
                : "Enable PhoneCast notification access on your phone. Only actual notifications from your phone will appear here.") + "</p>",
            (!allNotifications.length
                ? "<button type='button' class='workspace-secondary-button' data-phonecast-action='enable-notifications'>SET UP NOTIFICATION ACCESS</button>"
                : ""),
            "</div>"
        ].join("");
    }

    var conversationHtml = "";

    if (selectedNotification) {
        var selectedKey = String(selectedNotification.key);
        var encodedSelectedKey = encodeURIComponent(selectedKey);
        var safeTitle = escapeHtml(selectedNotification.title || selectedNotification.appName || "Notification");
        var safeAppName = escapeHtml(selectedNotification.appName || "App notification");
        var safeText = escapeHtml(selectedNotification.text || "No preview text available.");
        var replySupported = Boolean(selectedNotification.hasReplyAction);
        var actionStatus = state.phoneActionStatus &&
            String(state.phoneActionStatus.notificationKey || "") === selectedKey
            ? "<p class='workspace-inline-status' role='status'>" + escapeHtml(state.phoneActionStatus.message || "") + "</p>"
            : "";

        conversationHtml = [
            "<div class='message-detail-heading'><span class='workspace-eyebrow'>" + safeAppName + "</span><h3>" + safeTitle + "</h3><time>" + escapeHtml(formatPhonecastNotificationTime(selectedNotification.postTime)) + "</time></div>",
            "<div class='message-detail-body'><p>" + safeText + "</p></div>",
            "<div class='message-detail-actions'>",
            "<span class='integration-pill " + (replySupported ? "reply-available" : "pending") + "'>" + (replySupported ? "REPLY ACTION AVAILABLE" : "NO QUICK REPLY ACTION") + "</span>",
            "<button type='button' class='workspace-secondary-button notification-dismiss-button' data-message-action='dismiss' data-notification-key='" + encodedSelectedKey + "'>DISMISS</button>",
            "</div>",
            (replySupported
                ? "<div class='message-reply-composer'><textarea id='phonecastReplyText' class='workspace-input' rows='2' placeholder='Write a reply...' aria-label='Write a reply'></textarea><button type='button' class='workspace-primary-button' data-message-action='reply' data-notification-key='" + encodedSelectedKey + "' aria-label='Send reply'>➤</button></div>"
                : "<div class='message-reply-composer'><textarea class='workspace-input' rows='2' placeholder='This notification does not expose a reply action.' disabled aria-label='Reply unavailable'></textarea><button type='button' class='workspace-primary-button' disabled aria-label='Send reply'>➤</button></div>"),
            actionStatus
        ].join("");
    } else {
        conversationHtml = [
            "<div class='conversation-empty-state'><div class='workspace-empty-icon' aria-hidden='true'>" + phonecastGlyph("messages", 24) + "</div><strong>Select a notification</strong><p>Choose an item to see its actual preview and reply when the app provides a supported reply action.</p></div>",
            "<div class='message-reply-composer'><textarea class='workspace-input' rows='2' placeholder='Select a message to reply' disabled aria-label='Reply unavailable'></textarea><button type='button' class='workspace-primary-button' disabled aria-label='Send reply'>➤</button></div>"
        ].join("");
    }

    return [
        "<div class='workspace-view messages-workspace'>",
        "<header class='workspace-view-header'><div><span class='workspace-eyebrow'>NOTIFICATION INBOX</span><h2>Messages</h2><p>Phone notifications and supported quick replies.</p></div><div class='workspace-header-icon message-icon' aria-hidden='true'>" + phonecastGlyph("messages", 24) + "</div></header>",
        "<div class='messages-toolbar'>",
        "<label class='workspace-search-wrap'><span aria-hidden='true'>" + phonecastGlyph("search", 17) + "</span><input id='phonecastMessageSearch' class='workspace-input' type='search' placeholder='Search notifications and conversations...' value='" + escapeHtml(phonecastMessageQuery) + "' autocomplete='off'></label>",
        "<div class='message-filter-chips' role='group' aria-label='Filter messages'>" + filtersHtml + "</div>",
        "</div>",
        "<div class='messages-layout'>",
        "<section class='workspace-card messages-list-card'><div class='workspace-card-heading'><div><span class='workspace-eyebrow'>RECENT · " + allNotifications.length + "</span><h3>Notifications</h3></div><span class='integration-pill " + (allNotifications.length ? "reply-available" : "pending") + "'>" + (allNotifications.length ? "SYNCED" : "NO DATA") + "</span></div>",
        "<div class='phonecast-notification-list'>" + notificationListHtml + "</div></section>",
        "<section class='workspace-card message-conversation-card'>" + conversationHtml + "</section>",
        "</div></div>"
    ].join("");
}

function renderPhonecastPhoneyWorkspace() {
    return [
        "<div class='workspace-view phoney-workspace'>",
        "<header class='workspace-view-header'><div><span class='workspace-eyebrow'>YOUR PHONE ASSISTANT</span><h2>Phoney</h2><p>An AI workspace for phone tasks. We'll design its actions separately.</p></div><div class='workspace-header-icon phoney-icon' aria-hidden='true'>" + phonecastGlyph("sparkles", 24) + "</div></header>",
        "<section class='workspace-card phoney-chat-card'>",
        "<div class='phoney-welcome'><div class='phoney-orb' aria-hidden='true'><span>" + phonecastGlyph("sparkles", 30) + "</span></div><span class='workspace-eyebrow'>PHONECAST AI</span><h3>Meet Phoney</h3><p>This space is reserved for the assistant experience. No AI actions are simulated yet.</p></div>",
        "<div class='phoney-suggestion-grid'>",
        "<button type='button' class='phoney-suggestion' disabled><span>" + phonecastGlyph("messages", 17) + "</span><strong>Summarize notifications</strong><small>Planned</small></button>",
        "<button type='button' class='phoney-suggestion' disabled><span>" + phonecastGlyph("call", 17) + "</span><strong>Help manage calls</strong><small>Planned</small></button>",
        "<button type='button' class='phoney-suggestion' disabled><span>" + phonecastGlyph("search", 17) + "</span><strong>Find a conversation</strong><small>Planned</small></button>",
        "<button type='button' class='phoney-suggestion' disabled><span>" + phonecastGlyph("settings", 17) + "</span><strong>Change phone settings</strong><small>Planned</small></button>",
        "</div><form class='phoney-composer' id='phonecastPhoneyForm'><input class='workspace-input' type='text' placeholder='Phoney command input will be added after brainstorming...' disabled aria-label='Ask Phoney'><button type='submit' class='workspace-primary-button' disabled aria-label='Send command'>➤</button></form>",
        "</section></div>"
    ].join("");
}

function renderPhonecastSettingsWorkspace() {
    var query = phonecastSettingsQuery.trim().toLowerCase();
    var visibleItems = PHONECAST_SETTINGS_ITEMS.filter(function (item) {
        return !query || item.title.toLowerCase().includes(query) || item.detail.toLowerCase().includes(query);
    });

    var itemsHtml = visibleItems.map(function (item) {
        return [
            "<button type='button' class='settings-category-card' data-phonecast-setting-action='" + item.action + "' data-search='" + escapeHtml((item.title + " " + item.detail).toLowerCase()) + "'>",
            "<span class='settings-category-icon' aria-hidden='true'>" + phonecastGlyph(item.icon, 18) + "</span>",
            "<span class='settings-category-copy'><strong>" + escapeHtml(item.title) + "</strong><small>" + escapeHtml(item.detail) + "</small></span>",
            "<span class='settings-category-arrow' aria-hidden='true'>›</span>",
            "</button>"
        ].join("");
    }).join("");

    return [
        "<div class='workspace-view settings-workspace'>",
        "<header class='workspace-view-header'><div><span class='workspace-eyebrow'>CONNECTED ANDROID DEVICE</span><h2>Phone settings</h2><p>Open the corresponding system settings page on your phone.</p></div><div class='workspace-header-icon settings-icon' aria-hidden='true'>" + phonecastGlyph("settings", 24) + "</div></header>",
        "<label class='workspace-search-wrap settings-search-wrap'><span aria-hidden='true'>" + phonecastGlyph("search", 17) + "</span><input id='phonecastSettingsSearch' class='workspace-input' type='search' placeholder='Search phone settings...' value='" + escapeHtml(phonecastSettingsQuery) + "' autocomplete='off'></label>",
        "<div class='settings-category-grid' id='phonecastSettingsGrid'>" + itemsHtml + "</div>",
        (visibleItems.length ? "" : "<div class='workspace-empty-state compact-empty-state'><strong>No matching settings</strong><p>Try another search term.</p></div>"),
        "<p class='workspace-inline-status " + (phonecastWorkspaceNotice ? "" : "hidden") + "' id='phonecastSettingsNotice' role='status'>" + escapeHtml(phonecastWorkspaceNotice) + "</p>",
        "</div>"
    ].join("");
}

function renderPhonecastWorkspaceContent() {
    var host = document.getElementById("phoneCastWorkspaceContent");
    if (!host) {
        return;
    }

    switch (activePhonecastWorkspace) {
        case "messages":
            host.innerHTML = renderPhonecastMessagesWorkspace();
            break;
        case "phoney":
            host.innerHTML = renderPhonecastPhoneyWorkspace();
            break;
        case "settings":
            host.innerHTML = renderPhonecastSettingsWorkspace();
            break;
        case "calls":
        default:
            host.innerHTML = renderPhonecastCallsWorkspace();
            break;
    }

    setupPhonecastWorkspaceContentEvents();
}

function setPhonecastWorkspace(workspace) {
    var validWorkspaces = ["calls", "messages", "phoney", "settings"];
    if (!validWorkspaces.includes(workspace)) {
        return;
    }

    activePhonecastWorkspace = workspace;
    phonecastWorkspaceNotice = "";

    document.querySelectorAll("[data-phonecast-workspace]").forEach(function (button) {
        var selected = button.dataset.phonecastWorkspace === workspace;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-selected", String(selected));
        button.tabIndex = selected ? 0 : -1;
    });

    renderPhonecastWorkspaceContent();
}

function setupPhonecastWorkspaceContentEvents() {
    var host = document.getElementById("phoneCastWorkspaceContent");
    if (!host) {
        return;
    }

    host.querySelectorAll("[data-phonecast-call-view]").forEach(function (button) {
        button.addEventListener("click", function () {
            activePhonecastCallView = button.dataset.phonecastCallView || "dialpad";
            phonecastWorkspaceNotice = "";
            renderPhonecastWorkspaceContent();
        });
    });

    host.querySelectorAll("[data-dial-digit]").forEach(function (button) {
        button.addEventListener("click", function () {
            phonecastDialNumber += button.dataset.dialDigit || "";
            var input = document.getElementById("phonecastDialNumber");
            if (input) {
                input.value = phonecastDialNumber;
                input.focus();
            }
        });
    });

    var dialNumberInput = document.getElementById("phonecastDialNumber");
    dialNumberInput?.addEventListener("input", function () {
        phonecastDialNumber = dialNumberInput.value.replace(/[^0-9+*#(), -]/g, "");
        if (dialNumberInput.value !== phonecastDialNumber) {
            dialNumberInput.value = phonecastDialNumber;
        }
    });

    host.querySelector("[data-dial-action='clear']")?.addEventListener("click", function () {
        phonecastDialNumber = "";
        if (dialNumberInput) {
            dialNumberInput.value = "";
            dialNumberInput.focus();
        }
    });

    host.querySelector("[data-dial-action='backspace']")?.addEventListener("click", function () {
        phonecastDialNumber = phonecastDialNumber.slice(0, -1);
        if (dialNumberInput) {
            dialNumberInput.value = phonecastDialNumber;
            dialNumberInput.focus();
        }
    });

    host.querySelector("[data-dial-action='call']")?.addEventListener("click", function () {
        var number = phonecastDialNumber.trim();
        if (!number) {
            phonecastWorkspaceNotice = "Enter a phone number first.";
            renderPhonecastWorkspaceContent();
            return;
        }

        void sendRemoteInput({
            type: "PHONE_ACTION",
            action: "OPEN_DIALER",
            number: number
        });

        phonecastWorkspaceNotice =
            "Dialer request sent. Confirm the number and place the call on the mirrored phone screen.";
        renderPhonecastWorkspaceContent();
    });

    host.querySelectorAll("[data-message-filter]").forEach(function (button) {
        button.addEventListener("click", function () {
            phonecastMessageFilter = button.dataset.messageFilter || "all";
            renderPhonecastWorkspaceContent();
        });
    });

    var messageSearch = document.getElementById("phonecastMessageSearch");
    messageSearch?.addEventListener("input", function () {
        var cursorPosition = messageSearch.selectionStart;
        phonecastMessageQuery = messageSearch.value;
        renderPhonecastWorkspaceContent();
        var nextInput = document.getElementById("phonecastMessageSearch");
        nextInput?.focus();
        if (nextInput && cursorPosition !== null) {
            nextInput.setSelectionRange(cursorPosition, cursorPosition);
        }
    });

    host.querySelectorAll("[data-notification-select]").forEach(function (button) {
        button.addEventListener("click", function () {
            try {
                activePhonecastMessageKey = decodeURIComponent(
                    button.dataset.notificationSelect || ""
                );
            } catch (_) {
                activePhonecastMessageKey = "";
            }
            state.phoneActionStatus = null;
            renderPhonecastWorkspaceContent();
        });
    });

    host.querySelectorAll("[data-message-action]").forEach(function (button) {
        button.addEventListener("click", function () {
            var action = button.dataset.messageAction;
            var notificationKey = "";
            try {
                notificationKey = decodeURIComponent(
                    button.dataset.notificationKey || ""
                );
            } catch (_) {
                notificationKey = "";
            }

            if (!notificationKey || !["reply", "dismiss"].includes(action)) {
                return;
            }

            if (action === "reply") {
                var replyInput = document.getElementById("phonecastReplyText");
                var replyText = replyInput?.value.trim() || "";
                if (!replyText) {
                    phonecastWorkspaceNotice = "Write a reply first.";
                    renderPhonecastWorkspaceContent();
                    return;
                }

                state.phoneActionStatus = {
                    action: "REPLY_NOTIFICATION",
                    notificationKey: notificationKey,
                    success: false,
                    message: "Sending reply through the notification action..."
                };

                void sendRemoteInput({
                    type: "PHONE_ACTION",
                    action: "REPLY_NOTIFICATION",
                    notificationKey: notificationKey,
                    text: replyText
                });
            } else {
                state.phoneActionStatus = {
                    action: "DISMISS_NOTIFICATION",
                    notificationKey: notificationKey,
                    success: false,
                    message: "Dismissing notification..."
                };

                void sendRemoteInput({
                    type: "PHONE_ACTION",
                    action: "DISMISS_NOTIFICATION",
                    notificationKey: notificationKey
                });
            }

            renderPhonecastWorkspaceContent();
        });
    });

    var settingsSearch = document.getElementById("phonecastSettingsSearch");
    settingsSearch?.addEventListener("input", function () {
        var cursorPosition = settingsSearch.selectionStart;
        phonecastSettingsQuery = settingsSearch.value;
        renderPhonecastWorkspaceContent();
        var nextInput = document.getElementById("phonecastSettingsSearch");
        nextInput?.focus();
        if (nextInput && cursorPosition !== null) {
            nextInput.setSelectionRange(cursorPosition, cursorPosition);
        }
    });

    host.querySelectorAll("[data-phonecast-setting-action]").forEach(function (button) {
        button.addEventListener("click", function () {
            var action = button.dataset.phonecastSettingAction;
            if (!action) {
                return;
            }

            void sendRemoteInput({
                type: "PHONE_ACTION",
                action: action
            });

            phonecastWorkspaceNotice =
                "Settings request sent. Check the mirrored phone screen for the Android system page.";
            renderPhonecastWorkspaceContent();
        });
    });

    host.querySelector("[data-phonecast-action='enable-notifications']")?.addEventListener("click", function () {
        void sendRemoteInput({
            type: "PHONE_ACTION",
            action: "OPEN_NOTIFICATION_ACCESS_SETTINGS"
        });

        phonecastWorkspaceNotice =
            "Notification access settings opened on the phone. Enable PhoneCast there; notification syncing is the next integration step.";
        var status = host.querySelector(".workspace-empty-state");
        if (status) {
            var note = document.createElement("p");
            note.className = "workspace-inline-status";
            note.setAttribute("role", "status");
            note.textContent = phonecastWorkspaceNotice;
            status.appendChild(note);
        }
    });
}

export function showCastingPage() {
    if (!ensureApp()) {
        return;
    }

    state.currentPage = "casting";
    activePhonecastWorkspace = "calls";
    activePhonecastCallView = "dialpad";
    phonecastDialNumber = "";
    phonecastWorkspaceNotice = "";
    phonecastSettingsQuery = "";
    phonecastMessageQuery = "";
    phonecastMessageFilter = "all";
    activePhonecastMessageKey = "";

    app.innerHTML = [
        "<div class='casting-page phonecast-control-centre' id='castingPage'>",
        "<header class='casting-header'>",
        "<div class='casting-brand'><img src='./assets/phonecast-mark.svg' alt='PhoneCast'><div><strong>PhoneCast</strong><span>PHONE CONTROL CENTRE</span></div></div>",
        "<div class='casting-status'><span class='live-dot'></span><span id='phoneCastViewerStatus'>Preparing phone screen...</span></div>",
        "<div class='casting-actions casting-window-actions'>",
        "<button type='button' id='fullscreenButton'>FULLSCREEN</button>",
        "<button type='button' id='presentationButton'>PRESENTATION</button>",
        "<button type='button' id='annotationButton'>ANNOTATE</button>",
        "<button type='button' id='clearAnnotationButton' class='hidden'>CLEAR</button>",
        "<button type='button' id='landscapeFitButton' aria-pressed='false'>LANDSCAPE FIT</button>",
        "<button type='button' id='disconnectButton' class='danger'>DISCONNECT</button>",
        "</div></header>",
        "<main class='casting-main phonecast-control-main'>",
        "<section class='phonecast-preview-column' aria-label='Live phone screen and navigation'>",
        "<section class='viewer-shell'>",
        "<div id='phoneCastViewerLoading' class='viewer-loading'><div class='spinner'></div><strong>Preparing phone screen</strong><span>Waiting for H.264 video...</span></div>",
        "<canvas id='phoneCastVideoCanvas'></canvas>",
        "<canvas id='phoneCastAnnotationCanvas' aria-hidden='true'></canvas>",
        "<div id='phoneCastViewerEmpty' class='viewer-empty'><img src='./assets/phonecast-mark.svg' alt=''><strong>Phone screen unavailable</strong><span>Waiting for the video stream.</span></div>",
        "</section>",
        "<section class='phonecast-preview-controls'>",
        "<div class='preview-controls-heading'><div><span class='workspace-eyebrow'>REMOTE INPUT</span><strong>Control your phone</strong></div><span class='preview-connected-chip'><span class='feature-status-dot'></span> CONNECTED</span></div>",
        "<div class='preview-control-row'>",
        "<div class='preview-mode-switch' role='group' aria-label='Remote input mode'><button type='button' id='touchModeButton' aria-pressed='true' title='Use touchpad gestures to swipe the phone screen'>TOUCH</button><button type='button' id='pointerModeButton' aria-pressed='false' title='Use a visible pointer for precise clicking'>POINTER</button></div>",
        "<div class='remote-navigation-controls' aria-label='Android navigation'><button type='button' id='phoneBackButton' title='Android Back'>BACK</button><button type='button' id='phoneHomeButton' title='Android Home'>HOME</button><button type='button' id='phoneRecentsButton' title='Android Recent apps'>RECENTS</button></div>",
        "</div>",
        "<div class='preview-device-details'>",
        "<div><span>DEVICE</span><strong>" + escapeHtml(getDeviceDisplayName(state.selectedDevice) || "Android Phone") + "</strong></div>",
        "<div><span>RESOLUTION</span><strong id='phoneCastResolution'>Waiting...</strong></div>",
        "<div><span>STREAM</span><strong><span id='phoneCastFps'>" + (Number(state.video?.fps) || 60) + " FPS</span> · <span id='phoneCastCodec'>" + escapeHtml(state.video?.codec || "H.264") + "</span></strong></div>",
        "</div></section></section>",
        "<section class='phonecast-workspace-column' aria-label='PhoneCast workspaces'>",
        "<nav class='phonecast-module-tabs' role='tablist' aria-label='Phone functions'>",
        "<button type='button' class='phonecast-module-tab active' data-phonecast-workspace='calls' role='tab' aria-selected='true' tabindex='0'><span aria-hidden='true'>" + phonecastGlyph("call", 18) + "</span><strong>Calls</strong></button>",
        "<button type='button' class='phonecast-module-tab' data-phonecast-workspace='messages' role='tab' aria-selected='false' tabindex='-1'><span aria-hidden='true'>" + phonecastGlyph("messages", 18) + "</span><strong>Messages</strong></button>",
        "<button type='button' class='phonecast-module-tab' data-phonecast-workspace='phoney' role='tab' aria-selected='false' tabindex='-1'><span aria-hidden='true'>" + phonecastGlyph("sparkles", 18) + "</span><strong>Phoney</strong></button>",
        "<button type='button' class='phonecast-module-tab' data-phonecast-workspace='settings' role='tab' aria-selected='false' tabindex='-1'><span aria-hidden='true'>" + phonecastGlyph("settings", 18) + "</span><strong>Settings</strong></button>",
        "</nav>",
        "<div id='phoneCastWorkspaceContent' class='phonecast-workspace-content' role='tabpanel'></div>",
        "</section></main></div>"
    ].join("");

    document.getElementById("fullscreenButton")?.addEventListener("click", toggleFullscreen);
    document.getElementById("landscapeFitButton")?.addEventListener("click", toggleLandscapeFit);
    document.getElementById("presentationButton")?.addEventListener("click", togglePresentationMode);
    document.getElementById("annotationButton")?.addEventListener("click", toggleAnnotations);
    document.getElementById("clearAnnotationButton")?.addEventListener("click", clearAnnotations);
    document.getElementById("disconnectButton")?.addEventListener("click", handleDisconnect);

    document.getElementById("phoneBackButton")?.addEventListener("click", function () {
        sendRemoteInput({ type: "INPUT_KEY", key: "BACK" });
    });
    document.getElementById("phoneHomeButton")?.addEventListener("click", function () {
        sendRemoteInput({ type: "INPUT_KEY", key: "HOME" });
    });
    document.getElementById("phoneRecentsButton")?.addEventListener("click", function () {
        sendRemoteInput({ type: "INPUT_KEY", key: "RECENTS" });
    });

    document.querySelectorAll("[data-phonecast-workspace]").forEach(function (button) {
        button.addEventListener("click", function () {
            setPhonecastWorkspace(button.dataset.phonecastWorkspace || "calls");
        });
    });

    if (!phonecastNotificationListenerRegistered) {
        window.addEventListener("phonecast-notifications-updated", function () {
            if (
                state.currentPage === "casting" &&
                activePhonecastWorkspace === "messages"
            ) {
                renderPhonecastWorkspaceContent();
            }
        });
        phonecastNotificationListenerRegistered = true;
    }

    renderPhonecastWorkspaceContent();
    initializeVideoViewerSafely();
    setupRemoteInput();
    setupPresenterOverlay();
}


function setupRemoteInput() {

    const canvas =
        document.getElementById("phoneCastVideoCanvas");

    if (!canvas) {
        console.error("[PhoneCast Input] Viewer canvas is missing.");
        return;
    }

    const touchModeButton =
        document.getElementById("touchModeButton");

    const pointerModeButton =
        document.getElementById("pointerModeButton");

    const viewer =
        canvas.closest(".viewer-shell");

    let inputMode = "touch";
    let pointerActive = false;
    let activePointerId = null;
    let dragStartPoint = null;
    let lastPointerPoint = null;
    let dragStartedAt = 0;

    let wheelTimer = null;
    let wheelDeltaX = 0;
    let wheelDeltaY = 0;
    let wheelPoint = null;

    const sourceSize = () => ({
        width: Number(state.video.width || canvas.width),
        height: Number(state.video.height || canvas.height)
    });

    /*
     * Translate Electron's CSS-pixel pointer into the actual phone
     * video coordinates. Account for letterboxing and landscape-fit crop.
     */
    const getScreenPoint = event => {
        const rect = canvas.getBoundingClientRect();
        const { width: sourceWidth, height: sourceHeight } = sourceSize();

        if (
            rect.width <= 0 ||
            rect.height <= 0 ||
            sourceWidth <= 0 ||
            sourceHeight <= 0
        ) {
            return null;
        }

        const isLandscapeFit =
            viewer?.classList.contains("landscape-fit");

        const scale = isLandscapeFit
            ? Math.max(
                rect.width / sourceWidth,
                rect.height / sourceHeight
            )
            : Math.min(
                rect.width / sourceWidth,
                rect.height / sourceHeight
            );

        const renderedWidth = sourceWidth * scale;
        const renderedHeight = sourceHeight * scale;
        const offsetX = (rect.width - renderedWidth) / 2;
        const offsetY = (rect.height - renderedHeight) / 2;
        const localX = event.clientX - rect.left;
        const localY = event.clientY - rect.top;

        if (
            !isLandscapeFit &&
            (
                localX < offsetX ||
                localX > offsetX + renderedWidth ||
                localY < offsetY ||
                localY > offsetY + renderedHeight
            )
        ) {
            return null;
        }

        return {
            x: Math.round(Math.max(
                0,
                Math.min(sourceWidth - 1, (localX - offsetX) / scale)
            )),
            y: Math.round(Math.max(
                0,
                Math.min(sourceHeight - 1, (localY - offsetY) / scale)
            ))
        };
    };

    const setInputMode = mode => {
        inputMode = mode === "pointer" ? "pointer" : "touch";

        touchModeButton?.setAttribute(
            "aria-pressed",
            String(inputMode === "touch")
        );

        pointerModeButton?.setAttribute(
            "aria-pressed",
            String(inputMode === "pointer")
        );

        if (viewer) {
            viewer.dataset.inputMode = inputMode;
        }

        /*
         * Keep the real Windows pointer visible over the phone viewer. The
         * old Touch Mode hid it, which left the user with no navigation cursor.
         */
        canvas.style.cursor = "default";
    };

    touchModeButton?.addEventListener("click", () => setInputMode("touch"));
    pointerModeButton?.addEventListener("click", () => setInputMode("pointer"));
    setInputMode("touch");

    /*
     * Cursor movement is independent from clicking. This is the key
     * difference from the previous implementation, which ignored all
     * pointer movement unless a mouse button was already held.
     */
    canvas.addEventListener("pointermove", event => {
        const point = getScreenPoint(event);

        if (
            !pointerActive ||
            (
                activePointerId !== null &&
                event.pointerId !== activePointerId
            )
        ) {
            return;
        }

        if (point) {
            lastPointerPoint = point;
        }

        event.preventDefault();
    });

    canvas.addEventListener("pointerenter", () => {
        canvas.style.cursor = "default";
    });

    canvas.addEventListener("pointerleave", () => {
        canvas.style.cursor = "default";
    });

    /*
     * Do not send a long-running Android DOWN stroke immediately. The
     * previous implementation sent independent DOWN/MOVE/UP gestures,
     * which can cancel one another through AccessibilityService.
     *
     * Instead:
     * - a click/tap sends one complete tap gesture;
     * - a pressed drag sends one complete Android drag path on release.
     */
    canvas.addEventListener("pointerdown", event => {
        if (event.button !== 0 || pointerActive) {
            return;
        }

        const point = getScreenPoint(event);
        if (!point) {
            return;
        }

        pointerActive = true;
        activePointerId = event.pointerId;
        dragStartPoint = point;
        lastPointerPoint = point;
        dragStartedAt = performance.now();

        try {
            canvas.setPointerCapture?.(event.pointerId);
        } catch (_) {
            // Pointer capture is an enhancement; normal events still work.
        }

        canvas.focus();
        event.preventDefault();
    });

    canvas.addEventListener("pointerup", event => {
        if (
            !pointerActive ||
            event.button !== 0 ||
            (
                activePointerId !== null &&
                event.pointerId !== activePointerId
            )
        ) {
            return;
        }

        const endPoint =
            getScreenPoint(event) ||
            lastPointerPoint ||
            dragStartPoint;

        const startPoint = dragStartPoint;

        if (startPoint && endPoint) {
            const distance = Math.hypot(
                endPoint.x - startPoint.x,
                endPoint.y - startPoint.y
            );

            if (distance < 8) {
                sendRemoteInput({
                    type: "INPUT_TOUCH",
                    action: "tap",
                    pointerId: event.pointerId || 0,
                    x: endPoint.x,
                    y: endPoint.y,
                    timestamp: Date.now()
                });
            } else {
                const durationMs = Math.max(
                    100,
                    Math.min(
                        700,
                        performance.now() - dragStartedAt
                    )
                );

                sendRemoteInput({
                    type: "INPUT_SCROLL",
                    startX: startPoint.x,
                    startY: startPoint.y,
                    endX: endPoint.x,
                    endY: endPoint.y,
                    durationMs
                });
            }
        }

        try {
            canvas.releasePointerCapture?.(event.pointerId);
        } catch (_) {
            // Pointer capture can already have been released.
        }

        pointerActive = false;
        activePointerId = null;
        dragStartPoint = null;
        lastPointerPoint = null;
        dragStartedAt = 0;

        event.preventDefault();
    });

    canvas.addEventListener("pointercancel", () => {
        /*
         * Nothing has been injected until pointerup, so cancellation
         * cannot leave an Android finger stuck down.
         */
        pointerActive = false;
        activePointerId = null;
        dragStartPoint = null;
        lastPointerPoint = null;
        dragStartedAt = 0;
    });

    /*
     * Windows touchpads normally emit wheel events for two-finger
     * scrolling. Batch a burst into one complete gesture instead of
     * flooding Android with overlapping dispatchGesture calls.
     */
    const flushWheelGesture = () => {
        wheelTimer = null;

        const deltaX = wheelDeltaX;
        const deltaY = wheelDeltaY;
        const point = wheelPoint;

        wheelDeltaX = 0;
        wheelDeltaY = 0;
        wheelPoint = null;

        if (!point || (!deltaX && !deltaY)) {
            return;
        }

        const { width, height } = sourceSize();
        if (!width || !height) {
            return;
        }

        /*
         * Android gesture navigation: when the remote cursor is at the
         * bottom edge, an upward two-finger swipe opens Android Recents.
         * A dedicated Recents button is also available in the sidebar.
         *
         * Positive/negative wheel values follow Chromium's scrolling
         * convention; a negative Y delta represents a swipe-up gesture.
         */
        if (
            inputMode === "touch" &&
            deltaY <= -40 &&
            point.y >= height * 0.86
        ) {
            sendRemoteInput({
                type: "INPUT_KEY",
                key: "RECENTS"
            });
            return;
        }

        const useHorizontal =
            Math.abs(deltaX) > Math.abs(deltaY);

        let delta = useHorizontal ? deltaX : deltaY;
        if (!delta) {
            return;
        }

        const magnitude =
            Math.max(90, Math.min(680, Math.abs(delta) * 2.2));

        /*
         * Match the finger direction rather than the browser's content
         * scroll direction: negative X/Y becomes a left/up phone swipe.
         */
        const direction = delta < 0 ? -1 : 1;

        const startX = useHorizontal
            ? point.x - direction * magnitude * 0.5
            : point.x;
        const endX = useHorizontal
            ? point.x + direction * magnitude * 0.5
            : point.x;
        const startY = useHorizontal
            ? point.y
            : point.y - direction * magnitude * 0.5;
        const endY = useHorizontal
            ? point.y
            : point.y + direction * magnitude * 0.5;

        sendRemoteInput({
            type: "INPUT_SCROLL",
            startX: Math.round(Math.max(0, Math.min(width - 1, startX))),
            startY: Math.round(Math.max(0, Math.min(height - 1, startY))),
            endX: Math.round(Math.max(0, Math.min(width - 1, endX))),
            endY: Math.round(Math.max(0, Math.min(height - 1, endY))),
            durationMs: 220
        });
    };

    canvas.addEventListener("wheel", event => {
        const point = getScreenPoint(event);
        if (!point) {
            return;
        }

        const modeMultiplier =
            event.deltaMode === 1
                ? 16
                : event.deltaMode === 2
                    ? Math.max(canvas.clientHeight, 1)
                    : 1;

        wheelDeltaX += (Number(event.deltaX) || 0) * modeMultiplier;
        wheelDeltaY += (Number(event.deltaY) || 0) * modeMultiplier;
        wheelPoint = point;

        if (wheelTimer !== null) {
            clearTimeout(wheelTimer);
        }

        wheelTimer = setTimeout(
            flushWheelGesture,
            75
        );

        event.preventDefault();
    }, {
        passive: false
    });

    canvas.addEventListener("contextmenu", event => {
        event.preventDefault();
    });

    canvas.addEventListener("keydown", event => {
        const key = event.key;

        if (
            key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
        ) {
            sendRemoteInput({
                type: "INPUT_TEXT",
                text: key
            });
        } else {
            const keyMap = {
                Backspace: "BACKSPACE",
                Enter: "ENTER",
                Escape: "BACK",
                Home: "HOME"
            };

            if (keyMap[key]) {
                sendRemoteInput({
                    type: "INPUT_KEY",
                    key: keyMap[key]
                });
            }
        }

        event.preventDefault();
    });

    canvas.tabIndex = 0;
    canvas.addEventListener("click", () => canvas.focus());

    window.addEventListener("blur", () => {
        if (pointerActive) {
            pointerActive = false;
            activePointerId = null;
            dragStartPoint = null;
            lastPointerPoint = null;
            dragStartedAt = 0;
        }
    });

    window.addEventListener("beforeunload", () => {
        if (wheelTimer !== null) {
            clearTimeout(wheelTimer);
            wheelTimer = null;
        }
        pointerActive = false;
        activePointerId = null;
        dragStartPoint = null;
        lastPointerPoint = null;
        dragStartedAt = 0;
    }, { once: true });
}


// ============================================================
// DISCONNECT
// ============================================================

async function handleDisconnect() {

    try {

        await disconnectSession();

    } catch (
        error
    ) {

        console.error(
            "[PhoneCast Pages] Disconnect failed:",
            error
        );

    } finally {

        state.connecting =
            false;

        state.activeRequestId =
            null;

        state.video.active =
            false;

        state.video.connected =
            false;

        state.video.ready =
            false;

        state.connectionStatus =
            "Disconnected.";


        navigate(
            "home"
        );
    }
}


// ============================================================
// VIDEO VIEWER INITIALIZATION
// ============================================================

function initializeVideoViewerSafely() {

    try {

        initializeVideoViewer();

    } catch (
        error
    ) {

        console.error(
            "[PhoneCast Pages] Video viewer initialization failed:",
            error
        );


        const status =
            document.getElementById(
                "phoneCastViewerStatus"
            );


        if (status) {

            status.textContent =
                "Video viewer initialization failed.";
        }
    }
}


function setupPresenterOverlay() {

    const viewer =
        document.querySelector(".viewer-shell");
    const annotationCanvas =
        document.getElementById(
            "phoneCastAnnotationCanvas"
        );

    if (!viewer || !annotationCanvas) {
        return;
    }

    resizeAnnotationCanvas();
    window.addEventListener(
        "resize",
        resizeAnnotationCanvas
    );

    let drawing = false;
    let lastPoint = null;

    annotationCanvas.addEventListener(
        "pointerdown",
        event => {
            if (!viewer.classList.contains("annotations-active")) {
                return;
            }
            drawing = true;
            lastPoint = getOverlayPoint(event, annotationCanvas);
            annotationCanvas.setPointerCapture?.(event.pointerId);
            event.preventDefault();
        }
    );

    annotationCanvas.addEventListener(
        "pointermove",
        event => {
            if (!drawing || !lastPoint) {
                return;
            }
            const point =
                getOverlayPoint(event, annotationCanvas);
            const context =
                annotationCanvas.getContext("2d");
            context.strokeStyle = "#ffcf40";
            context.lineWidth = 4;
            context.lineCap = "round";
            context.beginPath();
            context.moveTo(lastPoint.x, lastPoint.y);
            context.lineTo(point.x, point.y);
            context.stroke();
            lastPoint = point;
            event.preventDefault();
        }
    );

    const finishDrawing = event => {
        drawing = false;
        lastPoint = null;
        annotationCanvas.releasePointerCapture?.(event.pointerId);
    };

    annotationCanvas.addEventListener(
        "pointerup",
        finishDrawing
    );
    annotationCanvas.addEventListener(
        "pointercancel",
        finishDrawing
    );
}


function getOverlayPoint(event, canvas) {

    const rect =
        canvas.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}


function resizeAnnotationCanvas() {

    const viewer =
        document.querySelector(".viewer-shell");
    const canvas =
        document.getElementById(
            "phoneCastAnnotationCanvas"
        );

    if (!viewer || !canvas) {
        return;
    }

    const rect =
        viewer.getBoundingClientRect();
    const previous =
        canvas.width && canvas.height
            ? canvas.toDataURL()
            : null;

    canvas.width = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));

    if (previous) {
        const image = new Image();
        image.onload = () => {
            canvas
                .getContext("2d")
                .drawImage(image, 0, 0, canvas.width, canvas.height);
        };
        image.src = previous;
    }
}


function togglePresentationMode() {

    const page =
        document.getElementById("castingPage");
    const button =
        document.getElementById("presentationButton");

    if (!page || !button) {
        return;
    }

    const active =
        page.classList.toggle("presentation-mode");
    button.textContent =
        active
            ? "EXIT PRESENTATION"
            : "PRESENTATION";
}


function toggleAnnotations() {

    const viewer =
        document.querySelector(".viewer-shell");
    const annotationButton =
        document.getElementById("annotationButton");
    const clearButton =
        document.getElementById("clearAnnotationButton");

    if (!viewer || !annotationButton || !clearButton) {
        return;
    }

    const active =
        viewer.classList.toggle("annotations-active");
    annotationButton.textContent =
        active
            ? "DRAWING ON"
            : "ANNOTATE";
    clearButton.classList.toggle(
        "hidden",
        !active
    );
}


function clearAnnotations() {

    const canvas =
        document.getElementById(
            "phoneCastAnnotationCanvas"
        );

    if (!canvas) {
        return;
    }

    canvas
        .getContext("2d")
        .clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
}


function toggleLandscapeFit() {

    const viewer =
        document.querySelector(
            ".viewer-shell"
        );
    const button =
        document.getElementById(
            "landscapeFitButton"
        );

    if (!viewer || !button) {
        return;
    }

    const enabled =
        viewer.classList.toggle(
            "landscape-fit"
        );

    button.setAttribute(
        "aria-pressed",
        String(enabled)
    );
    button.textContent =
        enabled
            ? "CONTAIN"
            : "LANDSCAPE FIT";
}


// ============================================================
// FULLSCREEN
// ============================================================

async function toggleFullscreen() {

    const page =
        document.getElementById(
            "castingPage"
        );


    if (!page) {
        return;
    }


    try {

        if (
            document.fullscreenElement
        ) {

            await document
                .exitFullscreen();

        } else {

            await page
                .requestFullscreen();
        }

    } catch (
        error
    ) {

        console.error(
            "[PhoneCast] Fullscreen failed:",
            error
        );
    }
}


// ============================================================
// HISTORY REFRESH
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


        if (
            result &&
            typeof result.catch ===
            "function"
        ) {

            result.catch(
                error => {

                    console.warn(
                        "[PhoneCast History] Refresh failed:",
                        error
                    );
                }
            );
        }

    } catch (
        error
    ) {

        console.warn(
            "[PhoneCast History] Refresh failed:",
            error
        );
    }
}