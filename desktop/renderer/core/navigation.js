"use strict";


import {
    state
} from "../state/appState.js";


import {
    showWelcomePage,
    showNamePage,
    showPasswordPage,
    showHomePage,
    showHistoryPage,
    showSettingsPage,
    showCastingPage
} from "../pages/pages.js";


export function navigate(
    page,
    data = {}
) {

    state.currentPage =
        page;


    switch (page) {

        case "welcome":

            showWelcomePage();

            break;


        case "name":

            showNamePage();

            break;


        case "password":

            showPasswordPage(
                data.laptopName ||
                ""
            );

            break;


        case "home":

            showHomePage();

            break;


        case "history":

            showHistoryPage();

            break;


        case "settings":

            showSettingsPage();

            break;


        case "casting":

            showCastingPage();

            break;


        default:

            console.warn(
                "Unknown PhoneCast page:",
                page
            );

            showWelcomePage();
    }
}


export function refreshCurrentPage() {

    navigate(
        state.currentPage
    );
}