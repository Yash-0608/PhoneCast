package com.phonecast.app.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
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
fun WelcomeScreen(
    onContinue: () -> Unit
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
                .size(320.dp)
                .align(Alignment.TopCenter)
                .alpha(0.10f)
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

        /*
         * -----------------------------------------------------
         * MAIN CONTENT
         * -----------------------------------------------------
         */

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
             * BRAND
             * -------------------------------------------------
             */

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {

                Image(
                    painter = painterResource(
                        id = R.drawable.logo
                    ),
                    contentDescription = "PhoneCast logo",
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Fit
                )

                Spacer(
                    modifier = Modifier.width(12.dp)
                )

                Column {

                    Text(
                        text = "PHONECAST",
                        color = PhoneCastColors.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.8.sp
                    )

                    Text(
                        text = "WIRELESS SCREEN SHARING",
                        color = PhoneCastColors.SecondaryText,
                        fontSize = 7.sp,
                        fontWeight = FontWeight.Medium,
                        letterSpacing = 2.1.sp
                    )
                }
            }

            Spacer(
                modifier = Modifier.height(22.dp)
            )

            /*
             * -------------------------------------------------
             * HERO AREA
             * -------------------------------------------------
             */

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {

                /*
                 * Soft blue glow behind phone
                 */

                Box(
                    modifier = Modifier
                        .size(280.dp)
                        .alpha(0.13f)
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

                Image(
                    painter = painterResource(
                        id = R.drawable.phone
                    ),
                    contentDescription = "PhoneCast phone",
                    modifier = Modifier
                        .fillMaxWidth(0.72f)
                        .height(330.dp),
                    contentScale = ContentScale.Fit
                )
            }

            /*
             * -------------------------------------------------
             * HELLO
             * -------------------------------------------------
             */

            Text(
                text = "Hello",
                color = PhoneCastColors.White,
                fontSize = 34.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.2.sp
            )

            Spacer(
                modifier = Modifier.height(10.dp)
            )

            Text(
                text = "Connect your phone to your laptop\n"
                        + "and share your screen wirelessly.",
                color = PhoneCastColors.SecondaryText,
                fontSize = 14.sp,
                lineHeight = 21.sp,
                textAlign = TextAlign.Center
            )

            Spacer(
                modifier = Modifier.height(20.dp)
            )

            /*
             * -------------------------------------------------
             * FEATURE STRIP
             * -------------------------------------------------
             */

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(
                        RoundedCornerShape(16.dp)
                    )
                    .background(
                        PhoneCastColors.Card.copy(
                            alpha = 0.90f
                        )
                    )
                    .padding(
                        horizontal = 12.dp,
                        vertical = 14.dp
                    ),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {

                WelcomeFeature(
                    title = "WIRELESS",
                    subtitle = "LAN"
                )

                FeatureDivider()

                WelcomeFeature(
                    title = "PRIVATE",
                    subtitle = "LOCAL"
                )

                FeatureDivider()

                WelcomeFeature(
                    title = "SECURE",
                    subtitle = "ENCRYPTED"
                )
            }

            Spacer(
                modifier = Modifier.height(18.dp)
            )

            /*
             * -------------------------------------------------
             * CONTINUE BUTTON
             * -------------------------------------------------
             */

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .shadow(
                        elevation = 12.dp,
                        shape = RoundedCornerShape(18.dp),
                        ambientColor = PhoneCastColors.NeonBlue,
                        spotColor = PhoneCastColors.NeonBlue
                    )
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
                    .clickable(
                        onClick = onContinue
                    ),
                contentAlignment = Alignment.Center
            ) {

                Text(
                    text = "TAP TO CONTINUE",
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp
                )
            }

            Spacer(
                modifier = Modifier.height(10.dp)
            )

            Text(
                text = "Your screen stays on your local network.",
                color = PhoneCastColors.MutedText,
                fontSize = 9.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun WelcomeFeature(
    title: String,
    subtitle: String
) {

    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {

        Text(
            text = title,
            color = PhoneCastColors.PrimaryText,
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.8.sp
        )

        Spacer(
            modifier = Modifier.height(3.dp)
        )

        Text(
            text = subtitle,
            color = PhoneCastColors.NeonBlue,
            fontSize = 8.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 0.6.sp
        )
    }
}

@Composable
private fun FeatureDivider() {

    Box(
        modifier = Modifier
            .width(1.dp)
            .height(25.dp)
            .background(
                PhoneCastColors.Border
            )
    )
}