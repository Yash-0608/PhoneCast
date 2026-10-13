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

let phoneWorkspaceEventListenerRegistered = false;


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
                                ◉
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
                                ◇
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
                                ♙
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
                            →
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
                        src="./assets/logo.png"
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
                        <span>⌂</span>
                        Home
                    </button>


                    <button
                        class="sidebar-item"
                        data-page="history"
                    >
                        <span>◷</span>
                        History
                    </button>


                    <button
                        class="sidebar-item"
                        data-page="settings"
                    >
                        <span>⚙</span>
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
                                ↻
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
                                src="./assets/logo.png"
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
                    ◷
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
                                src="./assets/logo.png"
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
                            ▣
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
                            ◇
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
                            ◈
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
                    src="./assets/logo.png"
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
                    <span>⌂</span>
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
                    <span>◷</span>
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
                    <span>⚙</span>
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

export function showCastingPage() {

    if (!ensureApp()) {
        return;
    }

    state.currentPage = "casting";

    const deviceName =
        getDeviceDisplayName(state.selectedDevice) ||
        "Android Phone";

    app.innerHTML = `

        <div class="casting-page control-centre-page" id="castingPage">

            <header class="casting-header">

                <div class="casting-brand">
                    <img src="./assets/logo.png" alt="PhoneCast">
                    <div>
                        <strong>PhoneCast</strong>
                        <span>PHONE CONTROL CENTRE</span>
                    </div>
                </div>

                <div class="casting-status">
                    <span class="live-dot"></span>
                    <span id="phoneCastViewerStatus">Connecting to phone...</span>
                </div>

                <div class="casting-actions">
                    <button type="button" id="fullscreenButton">FULLSCREEN</button>
                    <button type="button" id="presentationButton">PRESENTATION</button>
                    <button type="button" id="annotationButton">ANNOTATE</button>
                    <button type="button" id="clearAnnotationButton" class="hidden">CLEAR</button>
                    <button type="button" id="landscapeFitButton" aria-pressed="false">LANDSCAPE FIT</button>
                    <button type="button" id="disconnectButton" class="danger">DISCONNECT</button>
                </div>

            </header>

            <main class="casting-main control-centre-main">

                <section class="viewer-column" aria-label="Live phone screen">

                    <div class="viewer-device-header">
                        <div class="viewer-device-identity">
                            <span class="eyebrow">LIVE PHONE</span>
                            <strong title="${escapeHtml(deviceName)}">${escapeHtml(deviceName)}</strong>
                        </div>
                        <span class="viewer-live-badge"><span></span> LIVE</span>
                    </div>

                    <section class="viewer-shell">

                        <div id="phoneCastViewerLoading" class="viewer-loading">
                            <div class="spinner"></div>
                            <strong>Preparing phone screen</strong>
                            <span>Waiting for H.264 video...</span>
                        </div>

                        <canvas id="phoneCastVideoCanvas"></canvas>

                        <canvas id="phoneCastAnnotationCanvas" aria-hidden="true"></canvas>

                        <div id="phoneCastViewerEmpty" class="viewer-empty">
                            <img src="./assets/logo.png" alt="">
                            <strong>Phone screen unavailable</strong>
                            <span>Waiting for the video stream.</span>
                        </div>

                    </section>

                    <div class="phone-navigation-bar" aria-label="Android navigation">
                        <button type="button" id="phoneBackButton" title="Android Back">
                            <span aria-hidden="true">‹</span>
                            <small>BACK</small>
                        </button>
                        <button type="button" id="phoneHomeButton" title="Android Home">
                            <span class="nav-home-glyph" aria-hidden="true"></span>
                            <small>HOME</small>
                        </button>
                        <button type="button" id="phoneRecentsButton" title="Android Recent apps">
                            <span class="nav-recents-glyph" aria-hidden="true"></span>
                            <small>RECENTS</small>
                        </button>
                    </div>

                    <div class="viewer-stream-summary">
                        <span id="phoneCastResolution">Resolution pending</span>
                        <span class="stream-separator"></span>
                        <span id="phoneCastFps">${Number(state.video?.fps) || 60} FPS</span>
                        <span class="stream-separator"></span>
                        <span id="phoneCastCodec">${escapeHtml(state.video?.codec || "H.264")}</span>
                    </div>

                </section>

                <section class="workspace-shell" aria-label="PhoneCast workspaces">

                    <nav class="workspace-tab-nav" role="tablist" aria-label="Phone tools">

                        <button type="button" class="workspace-tab active" id="workspaceTabScreen"
                            role="tab" aria-selected="true" aria-controls="workspacePanelScreen"
                            data-workspace-tab="screen">
                            <span aria-hidden="true">▣</span><span>Screen</span>
                        </button>

                        <button type="button" class="workspace-tab" id="workspaceTabCalls"
                            role="tab" aria-selected="false" aria-controls="workspacePanelCalls"
                            data-workspace-tab="calls">
                            <span aria-hidden="true">☎</span><span>Calls</span>
                        </button>

                        <button type="button" class="workspace-tab" id="workspaceTabMessages"
                            role="tab" aria-selected="false" aria-controls="workspacePanelMessages"
                            data-workspace-tab="messages">
                            <span aria-hidden="true">▤</span><span>Messages</span>
                        </button>

                        <button type="button" class="workspace-tab" id="workspaceTabPhoney"
                            role="tab" aria-selected="false" aria-controls="workspacePanelPhoney"
                            data-workspace-tab="phoney">
                            <span aria-hidden="true">✧</span><span>Phoney</span>
                        </button>

                        <button type="button" class="workspace-tab" id="workspaceTabSettings"
                            role="tab" aria-selected="false" aria-controls="workspacePanelSettings"
                            data-workspace-tab="settings">
                            <span aria-hidden="true">⚙</span><span>Settings</span>
                        </button>

                    </nav>

                    <div class="workspace-content">

                        <div id="workspaceFeedback" class="workspace-feedback hidden" role="status" aria-live="polite"></div>

                        <section class="workspace-panel" id="workspacePanelScreen"
                            role="tabpanel" aria-labelledby="workspaceTabScreen"
                            data-workspace-panel="screen">

                            <div class="workspace-heading">
                                <div>
                                    <span class="eyebrow">CONNECTED DEVICE</span>
                                    <h1>Phone control</h1>
                                    <p>Your live phone screen stays here while you switch workspaces.</p>
                                </div>
                                <span class="connection-state-pill"><span></span> Connected</span>
                            </div>

                            <div class="workspace-stat-grid">
                                <article class="workspace-stat-card">
                                    <span class="stat-icon">▣</span>
                                    <span class="eyebrow">DEVICE</span>
                                    <strong title="${escapeHtml(deviceName)}">${escapeHtml(deviceName)}</strong>
                                    <small>Authorized session</small>
                                </article>
                                <article class="workspace-stat-card">
                                    <span class="stat-icon">↗</span>
                                    <span class="eyebrow">STREAM</span>
                                    <strong id="workspaceStreamStatus">H.264</strong>
                                    <small>Live phone display</small>
                                </article>
                                <article class="workspace-stat-card">
                                    <span class="stat-icon">⌁</span>
                                    <span class="eyebrow">INPUT</span>
                                    <strong id="workspaceInputModeStatus">Touch mode</strong>
                                    <small>Touchpad and pointer</small>
                                </article>
                            </div>

                            <section class="workspace-card">
                                <div class="workspace-card-heading">
                                    <div>
                                        <h2>Interaction mode</h2>
                                        <p>Choose how laptop input should control your phone.</p>
                                    </div>
                                </div>
                                <div class="interaction-mode-grid">
                                    <button type="button" id="touchModeButton" class="interaction-mode-option selected"
                                        aria-pressed="true">
                                        <span class="mode-icon" aria-hidden="true">⌁</span>
                                        <span><strong>Touch mode</strong><small>Use touchpad gestures to swipe and scroll.</small></span>
                                        <span class="mode-radio" aria-hidden="true"></span>
                                    </button>
                                    <button type="button" id="pointerModeButton" class="interaction-mode-option"
                                        aria-pressed="false">
                                        <span class="mode-icon" aria-hidden="true">↖</span>
                                        <span><strong>Pointer mode</strong><small>Use precise taps and click-drag interaction.</small></span>
                                        <span class="mode-radio" aria-hidden="true"></span>
                                    </button>
                                </div>
                            </section>

                            <section class="workspace-card">
                                <div class="workspace-card-heading">
                                    <div>
                                        <h2>Quick navigation</h2>
                                        <p>Android Back, Home and Recents are always available below the live screen.</p>
                                    </div>
                                </div>
                                <div class="quick-nav-explainer">
                                    <span class="quick-nav-icon" aria-hidden="true">⌘</span>
                                    <div>
                                        <strong>Gesture navigation</strong>
                                        <p>Use a two-finger touchpad swipe over the phone preview. Swipe up near the bottom edge to open Recents.</p>
                                    </div>
                                </div>
                            </section>

                            <div class="workspace-note">
                                <span class="note-dot"></span>
                                <span>The mirrored phone remains active when you switch tabs.</span>
                            </div>

                        </section>

                        <section class="workspace-panel hidden" id="workspacePanelCalls"
                            role="tabpanel" aria-labelledby="workspaceTabCalls"
                            data-workspace-panel="calls" hidden>

                            <div class="workspace-heading">
                                <div>
                                    <span class="eyebrow">PHONE</span>
                                    <h1>Calling</h1>
                                    <p>Dial numbers, review recent calls and find saved contacts.</p>
                                </div>
                                <span class="feature-status-pill">CALLS</span>
                            </div>

                            <div class="subtab-nav" role="tablist" aria-label="Calls sections">
                                <button type="button" class="subtab-button active" data-call-view="dialpad"
                                    aria-selected="true">Dial pad</button>
                                <button type="button" class="subtab-button" data-call-view="recent"
                                    aria-selected="false">Recent calls</button>
                                <button type="button" class="subtab-button" data-call-view="contacts"
                                    aria-selected="false">Contacts</button>
                            </div>

                            <div class="call-view-panel" data-call-panel="dialpad">
                                <div class="dialer-card">
                                    <label for="callNumberInput">PHONE NUMBER</label>
                                    <div class="dialer-number-row">
                                        <input id="callNumberInput" type="tel" inputmode="tel"
                                            autocomplete="off" placeholder="Enter a phone number"
                                            aria-label="Phone number">
                                        <button type="button" id="clearCallNumber" class="icon-button"
                                            title="Clear number" aria-label="Clear number">×</button>
                                    </div>
                                    <div class="dialpad-grid" aria-label="Dial pad">
                                        <button type="button" data-dial-digit="1">1<small>&nbsp;</small></button>
                                        <button type="button" data-dial-digit="2">2<small>ABC</small></button>
                                        <button type="button" data-dial-digit="3">3<small>DEF</small></button>
                                        <button type="button" data-dial-digit="4">4<small>GHI</small></button>
                                        <button type="button" data-dial-digit="5">5<small>JKL</small></button>
                                        <button type="button" data-dial-digit="6">6<small>MNO</small></button>
                                        <button type="button" data-dial-digit="7">7<small>PQRS</small></button>
                                        <button type="button" data-dial-digit="8">8<small>TUV</small></button>
                                        <button type="button" data-dial-digit="9">9<small>WXYZ</small></button>
                                        <button type="button" data-dial-digit="*">*</button>
                                        <button type="button" data-dial-digit="0">0<small>+</small></button>
                                        <button type="button" data-dial-digit="#">#</button>
                                    </div>
                                    <button type="button" id="openPhoneDialerButton" class="primary-workspace-button" disabled>
                                        <span aria-hidden="true">☎</span> Open phone dialer
                                    </button>
                                    <p class="integration-hint">PhoneCast opens Android's native dialer with this number filled in. Confirm the call on your phone.</p>
                                </div>
                            </div>

                            <div class="call-view-panel hidden" data-call-panel="recent" hidden>
                                <div id="recentCallsList" class="phone-data-list"></div>
                            </div>

                            <div class="call-view-panel hidden" data-call-panel="contacts" hidden>
                                <div class="contact-search-row">
                                    <span aria-hidden="true">⌕</span>
                                    <input type="search" id="contactSearchInput"
                                        placeholder="Search saved contacts..." aria-label="Search saved contacts">
                                </div>
                                <div id="contactsList" class="phone-data-list"></div>
                            </div>

                        </section>

                        <section class="workspace-panel hidden" id="workspacePanelMessages"
                            role="tabpanel" aria-labelledby="workspaceTabMessages"
                            data-workspace-panel="messages" hidden>

                            <div class="workspace-heading">
                                <div>
                                    <span class="eyebrow">INBOX</span>
                                    <h1>Messages</h1>
                                    <p>One place for SMS and supported app notification replies.</p>
                                </div>
                                <span class="feature-status-pill">MESSAGES</span>
                            </div>

                            <div class="message-search-row">
                                <span aria-hidden="true">⌕</span>
                                <input type="search" id="messageSearchInput"
                                    placeholder="Search notifications..." aria-label="Search notifications">
                            </div>

                            <div class="message-filter-row" role="group" aria-label="Message filters">
                                <button type="button" class="message-filter active" data-message-filter="all">All</button>
                                <button type="button" class="message-filter" data-message-filter="sms">SMS</button>
                                <button type="button" class="message-filter" data-message-filter="whatsapp">WhatsApp</button>
                                <button type="button" class="message-filter" data-message-filter="instagram">Instagram</button>
                                <button type="button" class="message-filter" data-message-filter="other">Other</button>
                            </div>

                            <section id="notificationAccessPrompt" class="workspace-card notification-access-prompt hidden">
                                <div class="workspace-card-heading">
                                    <div>
                                        <h2>Enable notification access</h2>
                                        <p>PhoneCast needs your approval to read notification previews and use reply actions supplied by supported apps.</p>
                                    </div>
                                </div>
                                <button type="button" id="enableNotificationAccessButton" class="primary-workspace-button">
                                    Open notification access settings
                                </button>
                            </section>

                            <div id="messageList" class="notification-list" aria-live="polite"></div>

                            <div class="workspace-empty-state spacious" id="notificationEmptyState">
                                <span class="empty-state-icon" aria-hidden="true">▤</span>
                                <h2>Your recent notifications will appear here</h2>
                                <p>Grant notification access on your phone. Reply is available only when the originating app exposes a supported inline-reply action.</p>
                            </div>

                        </section>

                        <section class="workspace-panel hidden" id="workspacePanelPhoney"
                            role="tabpanel" aria-labelledby="workspaceTabPhoney"
                            data-workspace-panel="phoney" hidden>

                            <div class="workspace-heading">
                                <div>
                                    <span class="eyebrow">PHONECAST AI</span>
                                    <h1>Meet Phoney</h1>
                                    <p>Your phone-focused AI assistant workspace.</p>
                                </div>
                                <span class="feature-status-pill ai">AI</span>
                            </div>

                            <div class="phoney-hero">
                                <div class="phoney-orb" aria-hidden="true"><span>✧</span></div>
                                <h2>Phoney is getting ready</h2>
                                <p>We'll design its personality, permissions and actions together before connecting it to real phone operations.</p>
                            </div>

                            <div class="phoney-capability-list">
                                <div><span>01</span><strong>Understand notifications</strong><small>Planned capability</small></div>
                                <div><span>02</span><strong>Help with calls and messages</strong><small>Planned capability</small></div>
                                <div><span>03</span><strong>Run approved phone actions</strong><small>Planned capability</small></div>
                            </div>

                            <div class="phoney-input-row">
                                <input type="text" placeholder="Phoney's command box will be designed later..."
                                    aria-label="Phoney command" disabled>
                                <button type="button" disabled aria-label="Send to Phoney">➤</button>
                            </div>

                        </section>

                        <section class="workspace-panel hidden" id="workspacePanelSettings"
                            role="tabpanel" aria-labelledby="workspaceTabSettings"
                            data-workspace-panel="settings" hidden>

                            <div class="workspace-heading">
                                <div>
                                    <span class="eyebrow">DEVICE PREFERENCES</span>
                                    <h1>Phone settings</h1>
                                    <p>Open system settings on the connected Android phone.</p>
                                </div>
                                <span class="feature-status-pill">DEVICE</span>
                            </div>

                            <div class="settings-launch-card">
                                <span class="settings-launch-icon" aria-hidden="true">⚙</span>
                                <h2>Android Settings</h2>
                                <p>This will open the real Settings app on your phone; it will appear in the live preview on the left.</p>
                                <button type="button" id="openAndroidSettingsButton" class="primary-workspace-button">
                                    Open phone settings
                                </button>
                                <small class="integration-hint">This opens the real Android Settings app on your phone.</small>
                            </div>

                            <div class="settings-category-grid">
                                <div class="settings-category-card"><span>⌁</span><strong>Network & internet</strong><small>Wi-Fi, mobile network</small></div>
                                <div class="settings-category-card"><span>▣</span><strong>Connected devices</strong><small>Bluetooth and pairing</small></div>
                                <div class="settings-category-card"><span>◉</span><strong>Display</strong><small>Brightness and display</small></div>
                                <div class="settings-category-card"><span>♫</span><strong>Sound & vibration</strong><small>Volume and alerts</small></div>
                                <div class="settings-category-card"><span>♙</span><strong>Privacy</strong><small>Permissions and activity</small></div>
                                <div class="settings-category-card"><span>⊕</span><strong>System</strong><small>Language and updates</small></div>
                            </div>

                        </section>

                    </div>

                </section>

            </main>

        </div>
    `;

    document.getElementById("fullscreenButton")?.addEventListener("click", toggleFullscreen);
    document.getElementById("landscapeFitButton")?.addEventListener("click", toggleLandscapeFit);
    document.getElementById("presentationButton")?.addEventListener("click", togglePresentationMode);
    document.getElementById("annotationButton")?.addEventListener("click", toggleAnnotations);
    document.getElementById("clearAnnotationButton")?.addEventListener("click", clearAnnotations);
    document.getElementById("disconnectButton")?.addEventListener("click", handleDisconnect);

    document.getElementById("phoneBackButton")?.addEventListener("click", () => {
        sendRemoteInput({ type: "INPUT_KEY", key: "BACK" });
    });
    document.getElementById("phoneHomeButton")?.addEventListener("click", () => {
        sendRemoteInput({ type: "INPUT_KEY", key: "HOME" });
    });
    document.getElementById("phoneRecentsButton")?.addEventListener("click", () => {
        sendRemoteInput({ type: "INPUT_KEY", key: "RECENTS" });
    });

    setupWorkspaceTabs();
    setupCallDialPad();
    setupPhoneWorkspaceData();
    initializeVideoViewerSafely();
    setupRemoteInput();
    setupPresenterOverlay();
}


function setupWorkspaceTabs() {

    const buttons = Array.from(
        document.querySelectorAll("[data-workspace-tab]")
    );

    const panels = Array.from(
        document.querySelectorAll("[data-workspace-panel]")
    );

    if (!buttons.length || !panels.length) {
        console.error("[PhoneCast Workspace] Missing workspace tabs or panels.");
        return;
    }

    const activateTab = tabName => {

        const validTab = buttons.some(
            button => button.dataset.workspaceTab === tabName
        );

        if (!validTab) {
            return;
        }

        buttons.forEach(button => {
            const active = button.dataset.workspaceTab === tabName;
            button.classList.toggle("active", active);
            button.setAttribute("aria-selected", String(active));
            button.tabIndex = active ? 0 : -1;
        });

        panels.forEach(panel => {
            const active = panel.dataset.workspacePanel === tabName;
            panel.classList.toggle("hidden", !active);
            panel.hidden = !active;
        });

        const workspaceContent = document.querySelector(".workspace-content");
        if (workspaceContent) {
            workspaceContent.dataset.activeWorkspace = tabName;
            workspaceContent.scrollTop = 0;
        }

        if (tabName === "calls") {
            if (!state.phoneData.callsLoaded && !state.phoneData.callsLoading) {
                state.phoneData.callsLoading = true;
                sendRemoteInput({ type: "GET_RECENT_CALLS" });
            }
            if (!state.phoneData.contactsLoaded && !state.phoneData.contactsLoading) {
                state.phoneData.contactsLoading = true;
                sendRemoteInput({ type: "GET_CONTACTS" });
            }
            renderCallWorkspaceData();
        } else if (tabName === "messages") {
            state.phoneData.notificationsLoading = true;
            sendRemoteInput({ type: "GET_NOTIFICATIONS" });
            renderNotificationWorkspaceData();
        }
    };

    buttons.forEach((button, index) => {

        button.addEventListener("click", () => {
            activateTab(button.dataset.workspaceTab);
        });

        button.addEventListener("keydown", event => {

            let nextIndex = index;

            if (event.key === "ArrowRight") {
                nextIndex = (index + 1) % buttons.length;
            } else if (event.key === "ArrowLeft") {
                nextIndex = (index - 1 + buttons.length) % buttons.length;
            } else if (event.key === "Home") {
                nextIndex = 0;
            } else if (event.key === "End") {
                nextIndex = buttons.length - 1;
            } else {
                return;
            }

            event.preventDefault();
            buttons[nextIndex].focus();
            activateTab(buttons[nextIndex].dataset.workspaceTab);
        });
    });

    document.querySelectorAll("[data-call-view]").forEach(button => {

        button.addEventListener("click", () => {

            const viewName = button.dataset.callView;

            document.querySelectorAll("[data-call-view]").forEach(tab => {
                const active = tab === button;
                tab.classList.toggle("active", active);
                tab.setAttribute("aria-selected", String(active));
            });

            document.querySelectorAll("[data-call-panel]").forEach(panel => {
                const active = panel.dataset.callPanel === viewName;
                panel.classList.toggle("hidden", !active);
                panel.hidden = !active;
            });
        });
    });

    activateTab("screen");
}


function setupCallDialPad() {

    const input = document.getElementById("callNumberInput");
    const clearButton = document.getElementById("clearCallNumber");

    if (!input) {
        return;
    }

    document.querySelectorAll("[data-dial-digit]").forEach(button => {

        button.addEventListener("click", () => {

            const digit = button.dataset.dialDigit || "";

            if (!digit) {
                return;
            }

            input.value = `${input.value || ""}${digit}`;
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        });
    });

    const openDialerButton =
        document.getElementById("openPhoneDialerButton");

    const updateDialerAvailability = () => {
        if (openDialerButton) {
            openDialerButton.disabled =
                !String(input.value || "").trim();
        }
    };

    input.addEventListener("input", updateDialerAvailability);

    openDialerButton?.addEventListener("click", () => {
        const number = String(input.value || "").trim();
        if (!number) {
            return;
        }
        sendRemoteInput({
            type: "OPEN_PHONE_DIALER",
            number
        });
    });

    clearButton?.addEventListener("click", () => {
        input.value = "";
        updateDialerAvailability();
        input.focus();
    });

    document.querySelectorAll("[data-dial-number]").forEach(button => {
        button.addEventListener("click", () => {
            const number = button.dataset.dialNumber || "";
            if (!number) {
                return;
            }
            input.value = number;
            updateDialerAvailability();
            sendRemoteInput({
                type: "OPEN_PHONE_DIALER",
                number
            });
        });
    });

    input.addEventListener("keydown", event => {

        if (event.key === "Enter") {
            event.preventDefault();
            if (String(input.value || "").trim()) {
                sendRemoteInput({
                    type: "OPEN_PHONE_DIALER",
                    number: String(input.value || "").trim()
                });
            }
        }
    });

    updateDialerAvailability();
}


function setupPhoneWorkspaceData() {

    if (!phoneWorkspaceEventListenerRegistered) {

        window.addEventListener("phonecast:phone-data", event => {

            if (state.currentPage !== "casting") {
                return;
            }

            const detail = event.detail || {};

            if (
                detail.type === "PHONE_COMMAND_ERROR" ||
                detail.type === "PHONE_DATA_PERMISSION_DENIED"
            ) {
                showWorkspaceFeedback(
                    detail.message ||
                        "Android did not allow this phone action.",
                    "warning"
                );
            } else if (detail.type === "NOTIFICATION_ACCESS_REQUIRED") {
                showWorkspaceFeedback(
                    "Enable PhoneCast under Android notification access settings to sync notifications.",
                    "warning"
                );
            } else if (detail.type === "NOTIFICATION_REPLY_RESULT") {
                showWorkspaceFeedback(
                    detail.message ||
                        (detail.success ? "Reply sent." : "Reply could not be sent."),
                    detail.success ? "success" : "warning"
                );

                if (detail.success) {
                    document.querySelectorAll("[data-notification-reply-input]").forEach(input => {
                        if (input.dataset.notificationReplyInput === detail.notificationKey) {
                            input.value = "";
                        }
                    });
                }
            } else if (detail.type === "PHONE_COMMAND_RESULT") {
                showWorkspaceFeedback(
                    detail.command === "OPEN_PHONE_SETTINGS"
                        ? "Opened Android Settings on your phone."
                        : detail.command === "OPEN_PHONE_DIALER"
                            ? "Opened the native dialer. Confirm the call on your phone."
                            : "Phone action completed.",
                    "success"
                );
            } else {
                showWorkspaceFeedback("", "");
            }

            renderCallWorkspaceData();
            renderNotificationWorkspaceData();
        });

        phoneWorkspaceEventListenerRegistered = true;
    }

    document.getElementById("openAndroidSettingsButton")
        ?.addEventListener("click", () => {
            sendRemoteInput({ type: "OPEN_PHONE_SETTINGS" });
        });

    document.getElementById("enableNotificationAccessButton")
        ?.addEventListener("click", () => {
            sendRemoteInput({ type: "OPEN_NOTIFICATION_ACCESS_SETTINGS" });
        });

    document.getElementById("contactSearchInput")
        ?.addEventListener("input", renderCallWorkspaceData);

    document.getElementById("messageSearchInput")
        ?.addEventListener("input", renderNotificationWorkspaceData);

    document.querySelectorAll("[data-message-filter]").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll("[data-message-filter]").forEach(filter => {
                filter.classList.toggle("active", filter === button);
            });
            renderNotificationWorkspaceData();
        });
    });

    document.getElementById("messageList")?.addEventListener("click", event => {
        const button = event.target.closest("[data-notification-reply]");
        if (!button) {
            return;
        }

        const notificationKey = button.dataset.notificationReply || "";
        const actionIndex = Number(button.dataset.actionIndex);
        const replyInput = Array.from(
            document.querySelectorAll("[data-notification-reply-input]")
        ).find(input => input.dataset.notificationReplyInput === notificationKey);
        const text = String(replyInput?.value || "").trim();

        if (!notificationKey || !Number.isInteger(actionIndex) || actionIndex < 0 || !text) {
            showWorkspaceFeedback("Enter a reply before sending.", "warning");
            return;
        }

        button.disabled = true;
        button.textContent = "Sending…";

        sendRemoteInput({
            type: "REPLY_NOTIFICATION",
            notificationKey,
            actionIndex,
            text
        });
    });

    document.getElementById("recentCallsList")?.addEventListener("click", event => {
        const button = event.target.closest("[data-dial-number]");
        if (!button) {
            return;
        }

        const number = button.dataset.dialNumber || "";
        if (number) {
            document.getElementById("callNumberInput").value = number;
            sendRemoteInput({
                type: "OPEN_PHONE_DIALER",
                number
            });
        }
    });

    document.getElementById("contactsList")?.addEventListener("click", event => {
        const button = event.target.closest("[data-dial-number]");
        if (!button) {
            return;
        }

        const number = button.dataset.dialNumber || "";
        if (number) {
            document.getElementById("callNumberInput").value = number;
            sendRemoteInput({
                type: "OPEN_PHONE_DIALER",
                number
            });
        }
    });

    renderCallWorkspaceData();
    renderNotificationWorkspaceData();
}


function showWorkspaceFeedback(message, kind = "") {
    const feedback = document.getElementById("workspaceFeedback");
    if (!feedback) {
        return;
    }

    const cleaned = String(message || "").trim();
    feedback.textContent = cleaned;
    feedback.classList.toggle("hidden", !cleaned);
    feedback.classList.toggle("warning", kind === "warning");
    feedback.classList.toggle("success", kind === "success");
}


function formatPhoneTimestamp(value) {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
        return "Time unavailable";
    }

    try {
        return new Date(timestamp).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch (_) {
        return "Time unavailable";
    }
}


function formatPhoneDuration(value) {
    const duration = Math.max(0, Math.floor(Number(value) || 0));
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}


function renderCallWorkspaceData() {

    const callsList = document.getElementById("recentCallsList");
    const contactsList = document.getElementById("contactsList");

    if (callsList) {
        const calls = Array.isArray(state.phoneData.calls)
            ? state.phoneData.calls
            : [];

        if (state.phoneData.callsLoading && !state.phoneData.callsLoaded) {
            callsList.innerHTML = `
                <div class="workspace-empty-state">
                    <span class="spinner"></span>
                    <h2>Loading recent calls</h2>
                    <p>PhoneCast is waiting for Android's permission and call-history response.</p>
                </div>`;
        } else if (!calls.length) {
            callsList.innerHTML = `
                <div class="workspace-empty-state">
                    <span class="empty-state-icon" aria-hidden="true">◷</span>
                    <h2>No recent calls to show</h2>
                    <p>Grant call-history permission if Android asks. New call history will appear here when available.</p>
                </div>`;
        } else {
            callsList.innerHTML = calls.map(call => {
                const number = String(call.number || "");
                const name = String(call.name || number || "Unknown caller");
                const type = String(call.type || "CALL").toLowerCase().replace(/_/g, " ");
                const duration = call.type === "MISSED"
                    ? "Missed call"
                    : `Duration ${formatPhoneDuration(call.durationSeconds)}`;

                return `
                    <article class="phone-data-row">
                        <div class="phone-data-avatar" aria-hidden="true">${escapeHtml(name.slice(0, 1).toUpperCase())}</div>
                        <div class="phone-data-row-copy">
                            <strong>${escapeHtml(name)}</strong>
                            <small>${escapeHtml(type)} · ${escapeHtml(formatPhoneTimestamp(call.timestamp))}</small>
                            <small>${escapeHtml(duration)}</small>
                        </div>
                        <button type="button" class="phone-data-action" data-dial-number="${escapeHtml(number)}"
                            ${number ? "" : "disabled"}>CALL</button>
                    </article>`;
            }).join("");
        }
    }

    if (contactsList) {
        const contacts = Array.isArray(state.phoneData.contacts)
            ? state.phoneData.contacts
            : [];
        const query = String(
            document.getElementById("contactSearchInput")?.value || ""
        ).trim().toLowerCase();

        const filtered = contacts.filter(contact =>
            `${contact.name || ""} ${contact.number || ""}`
                .toLowerCase()
                .includes(query)
        );

        if (state.phoneData.contactsLoading && !state.phoneData.contactsLoaded) {
            contactsList.innerHTML = `
                <div class="workspace-empty-state">
                    <span class="spinner"></span>
                    <h2>Loading contacts</h2>
                    <p>Android may ask you to grant Contacts permission.</p>
                </div>`;
        } else if (!filtered.length) {
            contactsList.innerHTML = `
                <div class="workspace-empty-state">
                    <span class="empty-state-icon" aria-hidden="true">♙</span>
                    <h2>No matching contacts</h2>
                    <p>Grant Contacts permission when requested, or try a different search.</p>
                </div>`;
        } else {
            contactsList.innerHTML = filtered.map(contact => {
                const name = String(contact.name || contact.number || "Unnamed contact");
                const number = String(contact.number || "");
                return `
                    <article class="phone-data-row">
                        <div class="phone-data-avatar" aria-hidden="true">${escapeHtml(name.slice(0, 1).toUpperCase())}</div>
                        <div class="phone-data-row-copy">
                            <strong>${escapeHtml(name)}</strong>
                            <small>${escapeHtml(number)}</small>
                        </div>
                        <button type="button" class="phone-data-action" data-dial-number="${escapeHtml(number)}"
                            ${number ? "" : "disabled"}>CALL</button>
                    </article>`;
            }).join("");
        }
    }
}


function renderNotificationWorkspaceData() {

    const list = document.getElementById("messageList");
    const emptyState = document.getElementById("notificationEmptyState");
    const accessPrompt = document.getElementById("notificationAccessPrompt");

    if (!list || !emptyState || !accessPrompt) {
        return;
    }

    const accessGranted = Boolean(state.phoneData.notificationAccessGranted);
    accessPrompt.classList.toggle("hidden", accessGranted);

    const all = Array.isArray(state.phoneData.notifications)
        ? state.phoneData.notifications
        : [];
    const query = String(
        document.getElementById("messageSearchInput")?.value || ""
    ).trim().toLowerCase();
    const filter = document.querySelector("[data-message-filter].active")
        ?.dataset.messageFilter || "all";

    const isSms = item => /sms|mms|messaging|messages|telephony/i.test(
        `${item.packageName || ""} ${item.appName || ""}`
    );
    const matchesFilter = item => {
        const app = `${item.packageName || ""} ${item.appName || ""}`.toLowerCase();
        switch (filter) {
            case "sms": return isSms(item);
            case "whatsapp": return app.includes("whatsapp");
            case "instagram": return app.includes("instagram");
            case "other": return !isSms(item) && !app.includes("whatsapp") && !app.includes("instagram");
            default: return true;
        }
    };

    const notifications = all
        .filter(item => matchesFilter(item))
        .filter(item => `${item.appName || ""} ${item.title || ""} ${item.text || ""}`
            .toLowerCase()
            .includes(query))
        .sort((a, b) => Number(b.postedAt || 0) - Number(a.postedAt || 0));

    if (state.phoneData.notificationsLoading && !state.phoneData.notificationsLoaded && !notifications.length) {
        list.innerHTML = `
            <div class="workspace-empty-state">
                <span class="spinner"></span>
                <h2>Syncing notifications</h2>
                <p>Waiting for Android notification access and active phone notifications.</p>
            </div>`;
        emptyState.classList.add("hidden");
        return;
    }

    list.innerHTML = notifications.map(item => {
        const key = String(item.key || "");
        const actionIndex = Number(item.replyActionIndex);
        const canReply = Boolean(item.canReply) &&
            item.active !== false &&
            key &&
            Number.isInteger(actionIndex) &&
            actionIndex >= 0;

        const replyMarkup = canReply
            ? `
                <div class="notification-reply-row">
                    <input type="text" maxlength="4000"
                        data-notification-reply-input="${escapeHtml(key)}"
                        placeholder="Reply to ${escapeHtml(item.appName || "notification")}…"
                        aria-label="Reply to ${escapeHtml(item.appName || "notification")}">
                    <button type="button" data-notification-reply="${escapeHtml(key)}"
                        data-action-index="${actionIndex}">REPLY</button>
                </div>`
            : `<small class="notification-reply-unavailable">${item.active === false
                ? "This notification is no longer active."
                : "No inline reply action is available for this notification."}</small>`;

        return `
            <article class="notification-card">
                <div class="notification-card-top">
                    <div class="notification-app-icon" aria-hidden="true">${escapeHtml(String(item.appName || "App").slice(0, 1).toUpperCase())}</div>
                    <div class="notification-heading-copy">
                        <strong>${escapeHtml(item.appName || item.packageName || "Phone notification")}</strong>
                        <small>${escapeHtml(formatPhoneTimestamp(item.postedAt))}</small>
                    </div>
                    <span class="notification-state-dot ${item.active === false ? "inactive" : ""}"></span>
                </div>
                <div class="notification-copy">
                    <strong>${escapeHtml(item.title || item.appName || "Notification")}</strong>
                    <p>${escapeHtml(item.text || "No preview text was provided.")}</p>
                </div>
                ${replyMarkup}
            </article>`;
    }).join("");

    emptyState.classList.toggle("hidden", notifications.length > 0);

    if (!notifications.length) {
        emptyState.querySelector("h2").textContent =
            accessGranted
                ? "No matching notifications"
                : "Your recent notifications will appear here";
        emptyState.querySelector("p").textContent =
            accessGranted
                ? "Try another filter or search term. Some apps do not expose notification previews."
                : "Grant notification access on your phone. Reply is available only when the originating app exposes a supported inline-reply action.";
    }
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