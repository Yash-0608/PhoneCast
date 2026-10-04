package com.phonecast.app

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/*
 * ============================================================
 * PHONECAST DESIGN SYSTEM
 * ============================================================
 *
 * All major visual constants live here.
 *
 * MainActivity should not contain hundreds of individual
 * colors, text styles, and shape definitions.
 */


/* ============================================================
   COLORS
   ============================================================ */

object PhoneCastColors {

    /*
     * Main backgrounds
     */

    val Background =
        Color(0xFF050A0F)

    val BackgroundSecondary =
        Color(0xFF071018)

    val BackgroundTertiary =
        Color(0xFF0A151E)


    /*
     * Cards
     */

    val Card =
        Color(0xFF0B141C)

    val CardSecondary =
        Color(0xFF101B24)

    val CardElevated =
        Color(0xFF121E28)


    /*
     * PhoneCast blue
     */

    val NeonBlue =
        Color(0xFF00A8FF)

    val BrightBlue =
        Color(0xFF36B8FF)

    val SoftBlue =
        Color(0xFF66C9FF)

    val DarkBlue =
        Color(0xFF06243A)

    val DeepBlue =
        Color(0xFF031725)


    /*
     * Text
     */

    val White =
        Color(0xFFF1F7FC)

    val PrimaryText =
        Color(0xFFE7F2F9)

    val SecondaryText =
        Color(0xFF91A5B6)

    val MutedText =
        Color(0xFF64798A)

    val DisabledText =
        Color(0xFF435563)


    /*
     * Borders
     */

    val Border =
        Color(0xFF193346)

    val BorderBright =
        Color(0xFF24506C)

    val BorderBlue =
        Color(0xFF007DBD)


    /*
     * Status colors
     */

    val Success =
        Color(0xFF16D66B)

    val SuccessBackground =
        Color(0xFF092C1B)

    val Warning =
        Color(0xFFFFB020)

    val WarningBackground =
        Color(0xFF30240A)

    val Error =
        Color(0xFFFF4D67)

    val ErrorBackground =
        Color(0xFF32121A)


    /*
     * Special surfaces
     */

    val Glass =
        Color(0xCC0B141C)

    val GlassLight =
        Color(0xCC101B24)

    val Overlay =
        Color(0x99000000)
}


/* ============================================================
   TYPOGRAPHY
   ============================================================ */

object PhoneCastTypography {

    val Display =
        TextStyle(
            fontSize = 40.sp,
            lineHeight = 46.sp,
            fontWeight = FontWeight.Bold,
            color = PhoneCastColors.White
        )

    val ScreenTitle =
        TextStyle(
            fontSize = 30.sp,
            lineHeight = 36.sp,
            fontWeight = FontWeight.Bold,
            color = PhoneCastColors.White
        )

    val ScreenTitleBlue =
        TextStyle(
            fontSize = 30.sp,
            lineHeight = 36.sp,
            fontWeight = FontWeight.Bold,
            color = PhoneCastColors.NeonBlue
        )

    val LargeTitle =
        TextStyle(
            fontSize = 25.sp,
            lineHeight = 30.sp,
            fontWeight = FontWeight.Bold,
            color = PhoneCastColors.White
        )

    val SectionTitle =
        TextStyle(
            fontSize = 17.sp,
            lineHeight = 21.sp,
            fontWeight = FontWeight.Bold,
            color = PhoneCastColors.White
        )

    val CardTitle =
        TextStyle(
            fontSize = 15.sp,
            lineHeight = 19.sp,
            fontWeight = FontWeight.SemiBold,
            color = PhoneCastColors.PrimaryText
        )

    val Body =
        TextStyle(
            fontSize = 16.sp,
            lineHeight = 24.sp,
            fontWeight = FontWeight.Normal,
            color = PhoneCastColors.SecondaryText
        )

    val BodySmall =
        TextStyle(
            fontSize = 12.sp,
            lineHeight = 18.sp,
            fontWeight = FontWeight.Normal,
            color = PhoneCastColors.SecondaryText
        )

    val Caption =
        TextStyle(
            fontSize = 10.sp,
            lineHeight = 15.sp,
            fontWeight = FontWeight.Normal,
            color = PhoneCastColors.SecondaryText
        )

    val Tiny =
        TextStyle(
            fontSize = 9.sp,
            lineHeight = 13.sp,
            fontWeight = FontWeight.Normal,
            color = PhoneCastColors.MutedText
        )

    val Button =
        TextStyle(
            fontSize = 14.sp,
            lineHeight = 18.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.White
        )

    val ButtonSmall =
        TextStyle(
            fontSize = 10.sp,
            lineHeight = 13.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )

    val Brand =
        TextStyle(
            fontSize = 34.sp,
            lineHeight = 40.sp,
            fontWeight = FontWeight.Bold,
            color = PhoneCastColors.White
        )

    val BrandSubtitle =
        TextStyle(
            fontSize = 9.sp,
            lineHeight = 12.sp,
            fontWeight = FontWeight.Medium,
            letterSpacing = 3.5.sp,
            color = PhoneCastColors.SecondaryText
        )
}


/* ============================================================
   SHAPES
   ============================================================ */

object PhoneCastShapes {

    val Small =
        RoundedCornerShape(
            10.dp
        )

    val Medium =
        RoundedCornerShape(
            14.dp
        )

    val Card =
        RoundedCornerShape(
            18.dp
        )

    val Large =
        RoundedCornerShape(
            20.dp
        )

    val ExtraLarge =
        RoundedCornerShape(
            24.dp
        )

    val Pill =
        RoundedCornerShape(
            50.dp
        )

    val Button =
        RoundedCornerShape(
            30.dp
        )

    val TextField =
        RoundedCornerShape(
            16.dp
        )
}


/* ============================================================
   DIMENSIONS
   ============================================================ */

object PhoneCastDimensions {

    /*
     * Screen padding
     */

    val ScreenHorizontal =
        24.dp

    val ScreenVertical =
        16.dp


    /*
     * Card padding
     */

    val CardPadding =
        16.dp

    val CardPaddingLarge =
        20.dp


    /*
     * Standard spacing
     */

    val Space4 =
        4.dp

    val Space6 =
        6.dp

    val Space8 =
        8.dp

    val Space10 =
        10.dp

    val Space12 =
        12.dp

    val Space16 =
        16.dp

    val Space20 =
        20.dp

    val Space24 =
        24.dp

    val Space32 =
        32.dp

    val Space40 =
        40.dp


    /*
     * Icons
     */

    val IconSmall =
        18.dp

    val IconMedium =
        24.dp

    val IconLarge =
        40.dp

    val IconXLarge =
        52.dp


    /*
     * Buttons
     */

    val ButtonHeight =
        57.dp

    val SmallButtonHeight =
        42.dp


    /*
     * Borders
     */

    val BorderWidth =
        1.dp

    val BorderWidthStrong =
        1.5.dp
}


/* ============================================================
   MATERIAL COLOR SCHEME
   ============================================================ */

private val PhoneCastDarkColorScheme =
    darkColorScheme(

        primary =
            PhoneCastColors.NeonBlue,

        onPrimary =
            Color.White,

        primaryContainer =
            PhoneCastColors.DarkBlue,

        onPrimaryContainer =
            PhoneCastColors.White,

        secondary =
            PhoneCastColors.BrightBlue,

        onSecondary =
            Color.White,

        secondaryContainer =
            PhoneCastColors.CardSecondary,

        onSecondaryContainer =
            PhoneCastColors.PrimaryText,

        background =
            PhoneCastColors.Background,

        onBackground =
            PhoneCastColors.White,

        surface =
            PhoneCastColors.Card,

        onSurface =
            PhoneCastColors.PrimaryText,

        surfaceVariant =
            PhoneCastColors.CardSecondary,

        onSurfaceVariant =
            PhoneCastColors.SecondaryText,

        outline =
            PhoneCastColors.Border,

        error =
            PhoneCastColors.Error,

        onError =
            Color.White
)


/* ============================================================
   MATERIAL TYPOGRAPHY
   ============================================================ */

private val PhoneCastMaterialTypography =
    Typography(

        displayLarge =
            PhoneCastTypography.Display,

        headlineLarge =
            PhoneCastTypography.ScreenTitle,

        headlineMedium =
            PhoneCastTypography.LargeTitle,

        titleLarge =
            PhoneCastTypography.SectionTitle,

        titleMedium =
            PhoneCastTypography.CardTitle,

        bodyLarge =
            PhoneCastTypography.Body,

        bodyMedium =
            PhoneCastTypography.BodySmall,

        bodySmall =
            PhoneCastTypography.Caption,

        labelLarge =
            PhoneCastTypography.Button,

        labelMedium =
            PhoneCastTypography.ButtonSmall,

        labelSmall =
            PhoneCastTypography.Tiny
    )


/* ============================================================
   PHONECAST THEME
   ============================================================ */

@Composable
fun PhoneCastTheme(
    content: @Composable () -> Unit
) {

    MaterialTheme(

        colorScheme =
            PhoneCastDarkColorScheme,

        typography =
            PhoneCastMaterialTypography,

        content =
            content
    )
}