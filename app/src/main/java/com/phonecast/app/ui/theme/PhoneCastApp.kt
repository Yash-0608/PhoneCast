package com.phonecast.app.ui

import androidx.compose.runtime.Composable
import com.phonecast.app.PhoneCastDatabase
import com.phonecast.app.ui.HomeScreen
import com.phonecast.app.ui.NameScreen
import com.phonecast.app.ui.SecurityScreen
import com.phonecast.app.ui.WelcomeScreen
import com.phonecast.app.network.ConnectionRequest

@Composable
fun PhoneCastApp(
    userName: String?,
    onboardingPage: Int,
    pendingRequest: ConnectionRequest?,
    connectionHistory:
        List<PhoneCastDatabase.ConnectionHistory>,

    onWelcomeContinue: () -> Unit,
    onNameEntered: (String) -> Unit,
    onBackToWelcome: () -> Unit,
    onBackToName: () -> Unit,
    onSecureAccount: () -> Unit,

    onAcceptRequest:
        (ConnectionRequest) -> Unit,

    onRejectRequest:
        (ConnectionRequest) -> Unit,

    onEnableRemoteControl:
        () -> Unit
) {

    /*
     * ---------------------------------------------------------
     * EXISTING ACCOUNT
     * ---------------------------------------------------------
     *
     * SQLite has confirmed that the user has already created
     * their PhoneCast account.
     */

    if (
        !userName.isNullOrBlank()
    ) {

        HomeScreen(
            userName =
                userName,

            pendingRequest =
                pendingRequest,

            connectionHistory =
                connectionHistory,

            onAcceptRequest =
                onAcceptRequest,

            onRejectRequest =
                onRejectRequest,

            onEnableRemoteControl =
                onEnableRemoteControl
        )

        return
    }


    /*
     * ---------------------------------------------------------
     * FIRST-TIME ONBOARDING
     * ---------------------------------------------------------
     */

    when (
        onboardingPage
    ) {

        /*
         * -----------------------------------------------------
         * PAGE 0 — WELCOME
         * -----------------------------------------------------
         */

        0 -> {

            WelcomeScreen(
                onContinue =
                    onWelcomeContinue
            )
        }


        /*
         * -----------------------------------------------------
         * PAGE 1 — NAME
         * -----------------------------------------------------
         */

        1 -> {

            NameScreen(
                onBack =
                    onBackToWelcome,

                onContinue =
                    onNameEntered
            )
        }


        /*
         * -----------------------------------------------------
         * PAGE 2 — SECURITY
         * -----------------------------------------------------
         */

        2 -> {

            SecurityScreen(
                userName =
                    "",

                onBack =
                    onBackToName,

                onSecureAccount =
                    onSecureAccount
            )
        }


        /*
         * -----------------------------------------------------
         * FALLBACK
         * -----------------------------------------------------
         */

        else -> {

            WelcomeScreen(
                onContinue =
                    onWelcomeContinue
            )
        }
    }
}