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


    state.currentPage =
        "casting";


    app.innerHTML = `

        <div
            class="casting-page"
            id="castingPage"
        >

            <header class="casting-header">

                <div class="casting-brand">

                    <img
                        src="./assets/logo.png"
                        alt="PhoneCast"
                    >

                    <div>

                        <strong>
                            PhoneCast
                        </strong>

                        <span>
                            LIVE SCREEN
                        </span>

                    </div>

                </div>


                <div class="casting-status">

                    <span
                        class="live-dot"
                    ></span>

                    <span
                        id="phoneCastViewerStatus"
                    >
                        Preparing phone screen...
                    </span>

                </div>


                <div class="casting-actions">

                    <button
                        type="button"
                        id="fullscreenButton"
                    >
                        FULLSCREEN
                    </button>

                    <button
                        type="button"
                        id="presentationButton"
                    >
                        PRESENTATION
                    </button>

                    <button
                        type="button"
                        id="annotationButton"
                    >
                        ANNOTATE
                    </button>

                    <button
                        type="button"
                        id="clearAnnotationButton"
                        class="hidden"
                    >
                        CLEAR
                    </button>

                    <button
                        type="button"
                        id="landscapeFitButton"
                        aria-pressed="false"
                    >
                        LANDSCAPE FIT
                    </button>


                    <button
                        type="button"
                        id="disconnectButton"
                        class="danger"
                    >
                        DISCONNECT
                    </button>

                </div>

            </header>


            <main class="casting-main">

                <section class="viewer-shell">

                    <div
                        id="phoneCastViewerLoading"
                        class="viewer-loading"
                    >

                        <div class="spinner"></div>

                        <strong>
                            Preparing phone screen
                        </strong>

                        <span>
                            Waiting for H.264 video...
                        </span>

                    </div>


                    <canvas
                        id="phoneCastVideoCanvas"
                    ></canvas>

                    <canvas
                        id="phoneCastAnnotationCanvas"
                        aria-hidden="true"
                    ></canvas>

                    <span
                        id="phoneCastClickIndicator"
                        class="phonecast-click-indicator hidden"
                        aria-hidden="true"
                    ></span>


                    <div
                        id="phoneCastViewerEmpty"
                        class="viewer-empty"
                    >

                        <img
                                src="./assets/logo.png"
                            alt=""
                        >

                        <strong>
                            Phone screen unavailable
                        </strong>

                        <span>
                            Waiting for the video stream.
                        </span>

                    </div>

                </section>

                <aside class="viewer-info">

                    <div class="info-card">

                        <label>
                            DEVICE
                        </label>

                        <strong>
                            ${escapeHtml(
                                getDeviceDisplayName(
                                    state.selectedDevice
                                ) ||
                                "Android Phone"
                            )}
                        </strong>

                    </div>


                    <div class="info-card">

                        <label>
                            RESOLUTION
                        </label>

                        <strong id="phoneCastResolution">
                            Waiting...
                        </strong>

                    </div>


                    <div class="info-card">

                        <label>
                            FRAME RATE
                        </label>

                        <strong id="phoneCastFps">
                            ${
                                Number(
                                    state.video?.fps
                                ) || 60
                            } FPS
                        </strong>

                    </div>


                    <div class="info-card">

                        <label>
                            CODEC
                        </label>

                        <strong id="phoneCastCodec">
                            ${escapeHtml(
                                state.video?.codec ||
                                "H.264"
                            )}
                        </strong>

                    </div>

                </aside>

            </main>

        </div>
    `;


    document
        .getElementById(
            "fullscreenButton"
        )
        ?.addEventListener(
            "click",
            toggleFullscreen
        );

    document
        .getElementById(
            "landscapeFitButton"
        )
        ?.addEventListener(
            "click",
            toggleLandscapeFit
        );

    document
        .getElementById(
            "presentationButton"
        )
        ?.addEventListener(
            "click",
            togglePresentationMode
        );

    document
        .getElementById(
            "annotationButton"
        )
        ?.addEventListener(
            "click",
            toggleAnnotations
        );

    document
        .getElementById(
            "clearAnnotationButton"
        )
        ?.addEventListener(
            "click",
            clearAnnotations
        );


    document
        .getElementById(
            "disconnectButton"
        )
        ?.addEventListener(
            "click",
            handleDisconnect
        );


    initializeVideoViewerSafely();

    setupRemoteInput();
    setupPresenterOverlay();
}


function setupRemoteInput() {

    const canvas =
        document.getElementById(
            "phoneCastVideoCanvas"
        );

    if (!canvas) {
        return;
    }

    let pointerActive = false;
    let lastPointerPoint = null;
    let lastPointerSentAt = 0;

    const getScreenPoint = event => {
        const rect = canvas.getBoundingClientRect();
        const sourceWidth =
            state.video.width ||
            canvas.width;
        const sourceHeight =
            state.video.height ||
            canvas.height;

        if (
            !rect.width ||
            !rect.height ||
            !sourceWidth ||
            !sourceHeight
        ) {
            return null;
        }

        const viewer =
            canvas.closest(".viewer-shell");
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
        const renderedWidth =
            sourceWidth * scale;
        const renderedHeight =
            sourceHeight * scale;
        const offsetX =
            (rect.width - renderedWidth) / 2;
        const offsetY =
            (rect.height - renderedHeight) / 2;
        const localX =
            event.clientX - rect.left;
        const localY =
            event.clientY - rect.top;

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

        const sourceX =
            (localX - offsetX) / scale;
        const sourceY =
            (localY - offsetY) / scale;

        return {
            x: Math.round(Math.max(
                0,
                Math.min(
                    sourceWidth,
                    sourceX
                )
            )),
            y: Math.round(Math.max(
                0,
                Math.min(
                    sourceHeight,
                    sourceY
                )
            ))
        };
    };

    canvas.addEventListener("pointerdown", event => {
        if (event.button !== 0) {
            return;
        }
        const point = getScreenPoint(event);
        if (!point) {
            return;
        }

        pointerActive = true;
        lastPointerPoint = point;
        lastPointerSentAt = performance.now();
        canvas.setPointerCapture?.(event.pointerId);
        canvas.focus();
        sendRemoteInput({
            type: "INPUT_TOUCH",
            action: "down",
            pointerId: event.pointerId || 0,
            x: point.x,
            y: point.y,
            timestamp: Date.now()
        });
        showClickIndicator(event);
        event.preventDefault();
    });

    canvas.addEventListener("pointermove", event => {
        if (!pointerActive) {
            return;
        }

        const point = getScreenPoint(event);
        if (!point) {
            return;
        }

        const now = performance.now();
        const moved =
            !lastPointerPoint ||
            Math.hypot(
                point.x - lastPointerPoint.x,
                point.y - lastPointerPoint.y
            ) >= 1;

        if (!moved || now - lastPointerSentAt < 8) {
            return;
        }

        lastPointerPoint = point;
        lastPointerSentAt = now;
        sendRemoteInput({
            type: "INPUT_TOUCH",
            action: "move",
            pointerId: event.pointerId || 0,
            x: point.x,
            y: point.y,
            timestamp: Date.now()
        });
        showClickIndicator(event);
        event.preventDefault();
    });

    canvas.addEventListener("pointerup", event => {
        if (!pointerActive || event.button !== 0) {
            return;
        }
        const end =
            getScreenPoint(event) ||
            lastPointerPoint;
        if (!end) {
            pointerActive = false;
            lastPointerPoint = null;
            return;
        }

        pointerActive = false;
        lastPointerPoint = null;
        sendRemoteInput({
            type: "INPUT_TOUCH",
            action: "up",
            pointerId: event.pointerId || 0,
            x: end.x,
            y: end.y,
            timestamp: Date.now()
        });
        canvas.releasePointerCapture?.(event.pointerId);
        event.preventDefault();
    });

    canvas.addEventListener("pointercancel", event => {
        if (!pointerActive) {
            return;
        }

        pointerActive = false;
        lastPointerPoint = null;
        sendRemoteInput({
            type: "INPUT_TOUCH",
            action: "cancel",
            pointerId: event.pointerId || 0,
            timestamp: Date.now()
        });
    });

    canvas.addEventListener("wheel", event => {
        const point = getScreenPoint(event);
        if (!point || !event.deltaY) {
            return;
        }

        const distance =
            Math.max(
                80,
                Math.min(
                    900,
                    Math.abs(event.deltaY) * 2.5
                )
            );

        const direction =
            event.deltaY > 0
                ? -1
                : 1;

        sendRemoteInput({
            type: "INPUT_SCROLL",
            startX: point.x,
            startY: point.y - (direction * distance * 0.5),
            endX: point.x,
            endY: point.y + (direction * distance * 0.5),
            durationMs: 220
        });

        event.preventDefault();
    }, {
        passive: false
    });

    canvas.addEventListener("contextmenu", event => {
        event.preventDefault();
    });

    canvas.addEventListener("keydown", event => {
        const key = event.key;
        if (key.length === 1 && !event.ctrlKey && !event.metaKey) {
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


function showClickIndicator(event) {

    const indicator =
        document.getElementById(
            "phoneCastClickIndicator"
        );

    if (!indicator) {
        return;
    }

    const rect =
        event.currentTarget.getBoundingClientRect();
    indicator.style.left =
        `${event.clientX - rect.left}px`;
    indicator.style.top =
        `${event.clientY - rect.top}px`;
    indicator.classList.remove("hidden");
    indicator.classList.remove("pulse");
    void indicator.offsetWidth;
    indicator.classList.add("pulse");
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