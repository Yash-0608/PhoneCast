"use strict";


import {
    state
} from "./state/appState.js";


import {
    loadAccount
} from "./connection/connection.js";


import {
    setupEventListeners
} from "./core/events.js";


import {
    navigate
} from "./core/navigation.js";


async function initialize() {

    console.log(
        "[PhoneCast] Renderer starting..."
    );

    try {

        if (!document.getElementById("app")) {
            throw new Error("#app element missing.");
        }

        setupEventListeners();

        console.log("[PhoneCast] Loading account...");
        await loadAccount();
        console.log("[PhoneCast] Account loaded.");

        state.currentPage = "welcome";
        navigate("welcome");

        console.log("[PhoneCast] Renderer ready.");

    } catch (error) {

        console.error(
            "[PhoneCast] Renderer initialization failed:",
            error
        );

        const app = document.getElementById("app");

        if (app) {
            app.innerHTML = `
                <main style="padding:32px;color:#f4f8fc;font-family:Segoe UI, sans-serif">
                    <h1>PhoneCast could not start</h1>
                    <p style="color:#91a5b6">Open the terminal to see the renderer error.</p>
                </main>
            `;
        }
    }
}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initialize,
        {
            once:
                true
        }
    );

} else {

    initialize();
}