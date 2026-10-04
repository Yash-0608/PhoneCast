package com.phonecast.app.ui

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
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.phonecast.app.PhoneCastColors
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.CheckCircle

@Composable
fun NameScreen(
    onBack: () -> Unit,
    onContinue: (String) -> Unit
) {

    var name by remember {
        mutableStateOf("")
    }

    val keyboardController =
        LocalSoftwareKeyboardController.current

    val isValid =
        name.trim().length >= 2

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
                .size(300.dp)
                .align(Alignment.TopEnd)
                .clip(CircleShape)
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            PhoneCastColors.NeonBlue.copy(alpha = 0.12f),
                            Color.Transparent
                        )
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(
                    horizontal = 24.dp,
                    vertical = 28.dp
                )
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
                    text = "02 / 03",
                    color = PhoneCastColors.SecondaryText,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    letterSpacing = 1.sp
                )
            }

            Spacer(
                modifier = Modifier.height(44.dp)
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

                StepIndicator(
                    number = "01",
                    active = false
                )

                StepLine()

                StepIndicator(
                    number = "02",
                    active = true
                )

                StepLine()

                StepIndicator(
                    number = "03",
                    active = false
                )
            }

            Spacer(
                modifier = Modifier.height(38.dp)
            )

            /*
             * -------------------------------------------------
             * TITLE
             * -------------------------------------------------
             */

            Text(
                text = "What's your name?",
                color = PhoneCastColors.White,
                fontSize = 30.sp,
                lineHeight = 36.sp,
                fontWeight = FontWeight.Bold
            )

            Spacer(
                modifier = Modifier.height(10.dp)
            )

            Text(
                text = "Create your local PhoneCast profile.\n"
                        + "Your name will only be stored on this device.",
                color = PhoneCastColors.SecondaryText,
                fontSize = 14.sp,
                lineHeight = 22.sp
            )

            Spacer(
                modifier = Modifier.height(32.dp)
            )

            /*
             * -------------------------------------------------
             * NAME INPUT
             * -------------------------------------------------
             */

            Text(
                text = "YOUR NAME",
                color = PhoneCastColors.SecondaryText,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.5.sp
            )

            Spacer(
                modifier = Modifier.height(9.dp)
            )

            TextField(
                value = name,
                onValueChange = {
                    if (it.length <= 40) {
                        name = it
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(62.dp),
                singleLine = true,
                leadingIcon = {

                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = if (isValid) {
                            PhoneCastColors.NeonBlue
                        } else {
                            PhoneCastColors.SecondaryText
                        },
                        modifier = Modifier.size(21.dp)
                    )
                },
                placeholder = {

                    Text(
                        text = "Enter your name",
                        color = PhoneCastColors.MutedText,
                        fontSize = 15.sp
                    )
                },
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = PhoneCastColors.Card,
                    unfocusedContainerColor = PhoneCastColors.Card,
                    disabledContainerColor = PhoneCastColors.Card,
                    focusedTextColor = PhoneCastColors.White,
                    unfocusedTextColor = PhoneCastColors.White,
                    cursorColor = PhoneCastColors.NeonBlue,
                    focusedIndicatorColor = PhoneCastColors.NeonBlue,
                    unfocusedIndicatorColor = PhoneCastColors.Border,
                    focusedLeadingIconColor = PhoneCastColors.NeonBlue,
                    unfocusedLeadingIconColor = PhoneCastColors.SecondaryText
                ),
                shape = RoundedCornerShape(16.dp),
                keyboardOptions = KeyboardOptions(
                    imeAction = ImeAction.Done
                ),
                keyboardActions = KeyboardActions(
                    onDone = {

                        keyboardController?.hide()

                        if (isValid) {
                            onContinue(name.trim())
                        }
                    }
                )
            )

            Spacer(
                modifier = Modifier.height(12.dp)
            )

            /*
             * -------------------------------------------------
             * LOCAL DATA INFO
             * -------------------------------------------------
             */

            InfoCard(
                icon = Icons.Default.Security,
                title = "Your data stays local",
                description = "Your profile information is stored only "
                        + "on this phone. PhoneCast does not require "
                        + "a cloud account."
            )

            Spacer(
                modifier = Modifier.height(14.dp)
            )

            InfoCard(
                icon = Icons.Default.CheckCircle,
                title = "One-time setup",
                description = "After creating your profile, Android "
                        + "device security will protect connection "
                        + "requests."
            )

            Spacer(
                modifier = Modifier.weight(1f)
            )

            /*
             * -------------------------------------------------
             * CREATE ACCOUNT BUTTON
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
                        if (isValid) {
                            Brush.horizontalGradient(
                                colors = listOf(
                                    PhoneCastColors.NeonBlue,
                                    PhoneCastColors.BrightBlue
                                )
                            )
                        } else {
                            Brush.horizontalGradient(
                                colors = listOf(
                                    PhoneCastColors.CardSecondary,
                                    PhoneCastColors.CardSecondary
                                )
                            )
                        }
                    )
                    .border(
                        width = 1.dp,
                        color = if (isValid) {
                            PhoneCastColors.NeonBlue
                        } else {
                            PhoneCastColors.Border
                        },
                        shape = RoundedCornerShape(18.dp)
                    )
                    .clickable(
                        enabled = isValid
                    ) {

                        keyboardController?.hide()

                        onContinue(
                            name.trim()
                        )
                    },
                contentAlignment = Alignment.Center
            ) {

                Text(
                    text = "CREATE ACCOUNT",
                    color = if (isValid) {
                        Color.White
                    } else {
                        PhoneCastColors.DisabledText
                    },
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.1.sp
                )
            }

            Spacer(
                modifier = Modifier.height(12.dp)
            )

            Text(
                text = "No email • No password • No cloud account",
                modifier = Modifier.fillMaxWidth(),
                color = PhoneCastColors.MutedText,
                fontSize = 9.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
        }
    }
}

/*
 * -------------------------------------------------------------
 * STEP INDICATOR
 * -------------------------------------------------------------
 */

@Composable
private fun StepIndicator(
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
 * STEP LINE
 * -------------------------------------------------------------
 */

@Composable
private fun StepLine() {

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
 * INFORMATION CARD
 * -------------------------------------------------------------
 */

@Composable
private fun InfoCard(
    icon: ImageVector,
    title: String,
    description: String
) {

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(
                RoundedCornerShape(16.dp)
            )
            .background(
                PhoneCastColors.Card
            )
            .border(
                width = 1.dp,
                color = PhoneCastColors.Border,
                shape = RoundedCornerShape(16.dp)
            )
            .padding(15.dp),
        verticalAlignment = Alignment.Top
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
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(
                modifier = Modifier.height(4.dp)
            )

            Text(
                text = description,
                color = PhoneCastColors.SecondaryText,
                fontSize = 11.sp,
                lineHeight = 17.sp
            )
        }
    }
}