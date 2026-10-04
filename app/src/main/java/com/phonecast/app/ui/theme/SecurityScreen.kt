package com.phonecast.app.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.phonecast.app.PhoneCastColors
import com.phonecast.app.R

@Composable
fun SecurityScreen(
    userName: String,
    onBack: () -> Unit,
    onSecureAccount: () -> Unit
) {

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        PhoneCastColors.Background,
                        PhoneCastColors.BackgroundSecondary,
                        PhoneCastColors.DeepBlue
                    )
                )
            )
    ) {

        /*
         * -----------------------------------------------------
         * BACKGROUND GLOW
         * -----------------------------------------------------
         */

        Box(
            modifier = Modifier
                .size(340.dp)
                .align(Alignment.TopCenter)
                .alpha(0.11f)
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            PhoneCastColors.NeonBlue,
                            Color.Transparent
                        )
                    ),
                    CircleShape
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(
                    horizontal = 24.dp,
                    vertical = 28.dp
                ),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {

            /*
             * -------------------------------------------------
             * TOP BAR
             * -------------------------------------------------
             */

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {

                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(
                            PhoneCastColors.Card
                        )
                        .border(
                            width = 1.dp,
                            color = PhoneCastColors.Border,
                            shape = CircleShape
                        )
                        .clickable {
                            onBack()
                        },
                    contentAlignment = Alignment.Center
                ) {

                    Icon(
                        imageVector = Icons.Default.ArrowBack,
                        contentDescription = "Back",
                        tint = PhoneCastColors.PrimaryText,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Spacer(
                    modifier = Modifier.weight(1f)
                )

                Text(
                    text = "03 / 03",
                    color = PhoneCastColors.SecondaryText,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    letterSpacing = 1.sp
                )
            }

            Spacer(
                modifier = Modifier.height(30.dp)
            )

            /*
             * -------------------------------------------------
             * STEP INDICATOR
             * -------------------------------------------------
             */

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {

                SecurityStep(
                    number = "01",
                    active = false
                )

                SecurityStepLine()

                SecurityStep(
                    number = "02",
                    active = false
                )

                SecurityStepLine()

                SecurityStep(
                    number = "03",
                    active = true
                )
            }

            Spacer(
                modifier = Modifier.height(30.dp)
            )

            /*
             * -------------------------------------------------
             * TITLE
             * -------------------------------------------------
             */

            Text(
                text = "Secure your account",
                color = PhoneCastColors.White,
                fontSize = 29.sp,
                lineHeight = 35.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )

            Spacer(
                modifier = Modifier.height(9.dp)
            )

            Text(
                text = "Hi ${userName.ifBlank { "there" }}.\n"
                        + "Use your Android device security to protect "
                        + "incoming screen-sharing requests.",
                color = PhoneCastColors.SecondaryText,
                fontSize = 14.sp,
                lineHeight = 22.sp,
                textAlign = TextAlign.Center
            )

            /*
             * -------------------------------------------------
             * FINGERPRINT ART
             * -------------------------------------------------
             */

            Spacer(
                modifier = Modifier.height(20.dp)
            )

            Box(
                modifier = Modifier
                    .size(230.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.radialGradient(
                            colors = listOf(
                                PhoneCastColors.DarkBlue,
                                PhoneCastColors.Background
                            )
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {

                Image(
                    painter = painterResource(
                        id = R.drawable.fingerprint
                    ),
                    contentDescription = "Fingerprint security",
                    modifier = Modifier
                        .size(190.dp),
                    contentScale = ContentScale.Fit
                )
            }

            Spacer(
                modifier = Modifier.height(12.dp)
            )

            /*
             * -------------------------------------------------
             * SECURITY METHOD
             * -------------------------------------------------
             */

            SecurityMethodCard(
                icon = Icons.Default.Lock,
                title = "Android device security",
                description = "Biometric authentication or your "
                        + "device PIN, pattern, or password."
            )

            Spacer(
                modifier = Modifier.height(10.dp)
            )

            SecurityMethodCard(
                icon = Icons.Default.PhoneAndroid,
                title = "Protected on this phone",
                description = "PhoneCast never receives or stores "
                        + "your biometric data or device password."
            )

            Spacer(
                modifier = Modifier.weight(1f)
            )

            /*
             * -------------------------------------------------
             * SECURITY BUTTON
             * -------------------------------------------------
             */

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(57.dp)
                    .clip(
                        RoundedCornerShape(18.dp)
                    )
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(
                                PhoneCastColors.NeonBlue,
                                PhoneCastColors.BrightBlue
                            )
                        )
                    )
                    .border(
                        width = 1.dp,
                        color = PhoneCastColors.NeonBlue,
                        shape = RoundedCornerShape(18.dp)
                    )
                    .clickable {
                        onSecureAccount()
                    },
                contentAlignment = Alignment.Center
            ) {

                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {

                    Icon(
                        imageVector = Icons.Default.Security,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )

                    Spacer(
                        modifier = Modifier.size(9.dp)
                    )

                    Text(
                        text = "SECURE MY ACCOUNT",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.0.sp
                    )
                }
            }

            Spacer(
                modifier = Modifier.height(11.dp)
            )

            Text(
                text = "Authentication is handled by Android.",
                color = PhoneCastColors.MutedText,
                fontSize = 9.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}

/*
 * -------------------------------------------------------------
 * SECURITY STEP
 * -------------------------------------------------------------
 */

@Composable
private fun SecurityStep(
    number: String,
    active: Boolean
) {

    Box(
        modifier = Modifier
            .size(30.dp)
            .clip(CircleShape)
            .background(
                if (active) {
                    PhoneCastColors.NeonBlue
                } else {
                    PhoneCastColors.Card
                }
            )
            .border(
                width = 1.dp,
                color = if (active) {
                    PhoneCastColors.NeonBlue
                } else {
                    PhoneCastColors.Border
                },
                shape = CircleShape
            ),
        contentAlignment = Alignment.Center
    ) {

        Text(
            text = number,
            color = if (active) {
                Color.White
            } else {
                PhoneCastColors.MutedText
            },
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

/*
 * -------------------------------------------------------------
 * SECURITY STEP LINE
 * -------------------------------------------------------------
 */

@Composable
private fun SecurityStepLine() {

    Box(
        modifier = Modifier
            .height(1.dp)
            .background(
                PhoneCastColors.Border
            )
    )
}

/*
 * -------------------------------------------------------------
 * SECURITY METHOD CARD
 * -------------------------------------------------------------
 */

@Composable
private fun SecurityMethodCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    description: String
) {

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(
                RoundedCornerShape(15.dp)
            )
            .background(
                PhoneCastColors.Card
            )
            .border(
                width = 1.dp,
                color = PhoneCastColors.Border,
                shape = RoundedCornerShape(15.dp)
            )
            .padding(13.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {

        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(
                    PhoneCastColors.DarkBlue
                ),
            contentAlignment = Alignment.Center
        ) {

            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = PhoneCastColors.NeonBlue,
                modifier = Modifier.size(20.dp)
            )
        }

        Spacer(
            modifier = Modifier.size(12.dp)
        )

        Column(
            modifier = Modifier.weight(1f)
        ) {

            Text(
                text = title,
                color = PhoneCastColors.PrimaryText,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(
                modifier = Modifier.height(3.dp)
            )

            Text(
                text = description,
                color = PhoneCastColors.SecondaryText,
                fontSize = 10.sp,
                lineHeight = 15.sp
            )
        }
    }
}