package com.phonecast.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val PhoneCastWarmDarkScheme = darkColorScheme(
    primary = Purple80,
    onPrimary = Color(0xFF20150C),
    secondary = PurpleGrey80,
    onSecondary = Color(0xFF20150C),
    tertiary = Pink80,
    background = Color(0xFF0B0907),
    onBackground = Color(0xFFF9F1E4),
    surface = Color(0xFF17120D),
    onSurface = Color(0xFFF1E3CF),
    surfaceVariant = Color(0xFF211810),
    onSurfaceVariant = Color(0xFFB5A18A),
    outline = Color(0xFF3B2A1A)
)

private val PhoneCastWarmLightScheme = lightColorScheme(
    primary = Purple40,
    onPrimary = Color(0xFFFFF8EF),
    secondary = PurpleGrey40,
    onSecondary = Color(0xFFFFF8EF),
    tertiary = Pink40,
    background = Color(0xFFF4EBDD),
    onBackground = Color(0xFF211810),
    surface = Color(0xFFFFF8EF),
    onSurface = Color(0xFF211810),
    surfaceVariant = Color(0xFFEADCC7),
    onSurfaceVariant = Color(0xFF65513C),
    outline = Color(0xFFB7A184)
)

@Composable
fun PhoneCastTheme(
    darkTheme: Boolean = true,
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) {
        PhoneCastWarmDarkScheme
    } else {
        PhoneCastWarmLightScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
