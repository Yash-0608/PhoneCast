package com.phonecast.app

/**
 * Represents the high-level state of the PhoneCast application.
 *
 * This state is intentionally independent from Compose UI.
 *
 * The UI should display whatever state the application currently
 * reports here.
 */
sealed class PhoneCastAppState {

    /**
     * Application is starting.
     *
     * During this state we:
     *
     * - Open the local database
     * - Read the saved profile
     * - Prepare networking
     * - Decide whether onboarding is required
     */
    data object Starting : PhoneCastAppState()

    /**
     * No PhoneCast account exists yet.
     *
     * The user must go through the onboarding flow.
     */
    data object Onboarding : PhoneCastAppState()

    /**
     * The user has completed the name step and is currently
     * being asked to secure the PhoneCast account.
     *
     * The actual Android authentication is handled separately
     * by BiometricPrompt.
     */
    data class SecuritySetup(
        val userName: String
    ) : PhoneCastAppState()

    /**
     * PhoneCast account exists and the main dashboard can be shown.
     */
    data class Ready(
        val userName: String
    ) : PhoneCastAppState()

    /**
     * A non-fatal startup problem occurred.
     *
     * We keep this separate from the UI so the application can
     * decide later how the error should be presented.
     */
    data class Error(
        val message: String
    ) : PhoneCastAppState()
}


/**
 * Represents the individual pages of the first-time onboarding
 * experience.
 *
 * These values are deliberately separate from PhoneCastAppState.
 *
 * PhoneCastAppState answers:
 *
 *     "What overall state is the application in?"
 *
 * OnboardingPage answers:
 *
 *     "Which onboarding screen is currently visible?"
 */
enum class PhoneCastOnboardingPage {

    /**
     * First screen shown to a new user.
     */
    Welcome,

    /**
     * User enters their local PhoneCast name.
     */
    Name,

    /**
     * User authenticates with Android device security.
     */
    Security
}


/**
 * Small helper used when moving through onboarding.
 *
 * Keeping page transitions here prevents different parts of the
 * application from inventing their own integer values such as
 * 0, 1 and 2.
 */
object PhoneCastOnboarding {

    fun next(
        page: PhoneCastOnboardingPage
    ): PhoneCastOnboardingPage {

        return when (page) {

            PhoneCastOnboardingPage.Welcome ->
                PhoneCastOnboardingPage.Name

            PhoneCastOnboardingPage.Name ->
                PhoneCastOnboardingPage.Security

            PhoneCastOnboardingPage.Security ->
                PhoneCastOnboardingPage.Security
        }
    }

    fun previous(
        page: PhoneCastOnboardingPage
    ): PhoneCastOnboardingPage {

        return when (page) {

            PhoneCastOnboardingPage.Welcome ->
                PhoneCastOnboardingPage.Welcome

            PhoneCastOnboardingPage.Name ->
                PhoneCastOnboardingPage.Welcome

            PhoneCastOnboardingPage.Security ->
                PhoneCastOnboardingPage.Name
        }
    }
}