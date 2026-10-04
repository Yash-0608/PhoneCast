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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Devices
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material.icons.filled.TouchApp
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.phonecast.app.PhoneCastColors
import com.phonecast.app.PhoneCastDatabase
import com.phonecast.app.R
import com.phonecast.app.network.ConnectionRequest

@Composable
fun HomeScreen(
    userName: String,
    pendingRequest: ConnectionRequest?,
    connectionHistory: List<PhoneCastDatabase.ConnectionHistory>,
    onAcceptRequest: (ConnectionRequest) -> Unit,
    onRejectRequest: (ConnectionRequest) -> Unit,
    onEnableRemoteControl: () -> Unit
) {

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        PhoneCastColors.Background,
                        PhoneCastColors.BackgroundSecondary
                    )
                )
            )
    ) {

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(
                    horizontal = 20.dp
                ),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {

            item {

                Spacer(
                    modifier = Modifier.height(18.dp)
                )

                /*
                 * -------------------------------------------------
                 * HEADER
                 * -------------------------------------------------
                 */

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {

                    Column(
                        modifier = Modifier.weight(1f)
                    ) {

                        Text(
                            text = "Hello,",
                            color = PhoneCastColors.SecondaryText,
                            fontSize = 13.sp
                        )

                        Spacer(
                            modifier = Modifier.height(2.dp)
                        )

                        Text(
                            text = userName,
                            color = PhoneCastColors.White,
                            fontSize = 27.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

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
                            ),
                        contentAlignment = Alignment.Center
                    ) {

                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Settings",
                            tint = PhoneCastColors.SecondaryText,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                Spacer(
                    modifier = Modifier.height(18.dp)
                )

                /*
                 * -------------------------------------------------
                 * STATUS CARD
                 * -------------------------------------------------
                 */

                StatusCard()
            }

            item {

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(PhoneCastColors.Card)
                        .border(
                            1.dp,
                            PhoneCastColors.Border,
                            RoundedCornerShape(16.dp)
                        )
                        .clickable(onClick = onEnableRemoteControl)
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {

                    Icon(
                        imageVector = Icons.Default.TouchApp,
                        contentDescription = "Enable remote control",
                        tint = PhoneCastColors.NeonBlue,
                        modifier = Modifier.size(24.dp)
                    )

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "REMOTE CONTROL",
                            color = PhoneCastColors.SecondaryText,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.2.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Enable touch and keyboard control",
                            color = PhoneCastColors.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    Icon(
                        imageVector = Icons.Default.MoreVert,
                        contentDescription = "Open settings",
                        tint = PhoneCastColors.SecondaryText,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            item {

                /*
                 * -------------------------------------------------
                 * QUICK ACTIONS
                 * -------------------------------------------------
                 */

                Text(
                    text = "QUICK ACTIONS",
                    color = PhoneCastColors.SecondaryText,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.4.sp
                )

                Spacer(
                    modifier = Modifier.height(9.dp)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {

                    QuickAction(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.Devices,
                        title = "Devices",
                        subtitle = "Available"
                    )

                    QuickAction(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.History,
                        title = "History",
                        subtitle = "${connectionHistory.size} sessions"
                    )

                    QuickAction(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.Settings,
                        title = "Settings",
                        subtitle = "Preferences"
                    )
                }
            }

            item {

                /*
                 * -------------------------------------------------
                 * CONNECTION REQUESTS HEADER
                 * -------------------------------------------------
                 */

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {

                    Text(
                        text = "CONNECTION REQUESTS",
                        color = PhoneCastColors.SecondaryText,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.4.sp,
                        modifier = Modifier.weight(1f)
                    )

                    if (pendingRequest != null) {

                        Box(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(
                                    PhoneCastColors.NeonBlue
                                )
                                .padding(
                                    horizontal = 8.dp,
                                    vertical = 4.dp
                                )
                        ) {

                            Text(
                                text = "1 NEW",
                                color = Color.White,
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.7.sp
                            )
                        }
                    }
                }

                Spacer(
                    modifier = Modifier.height(9.dp)
                )

                if (pendingRequest == null) {

                    NoRequestsCard()

                } else {

                    ConnectionRequestCard(
                        request = pendingRequest,
                        onAccept = {
                            onAcceptRequest(pendingRequest)
                        },
                        onReject = {
                            onRejectRequest(pendingRequest)
                        }
                    )
                }
            }

            item {

                /*
                 * -------------------------------------------------
                 * HISTORY HEADER
                 * -------------------------------------------------
                 */

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {

                    Text(
                        text = "CONNECTION HISTORY",
                        color = PhoneCastColors.SecondaryText,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.4.sp,
                        modifier = Modifier.weight(1f)
                    )

                    Text(
                        text = "SEE ALL",
                        color = PhoneCastColors.NeonBlue,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.8.sp
                    )
                }
            }

            if (connectionHistory.isEmpty()) {

                item {
                    EmptyHistoryCard()
                }

            } else {

                items(
                    items = connectionHistory,
                    key = {
                        it.id
                    }
                ) { history ->

                    HistoryCard(
                        history = history
                    )
                }
            }

            item {

                Spacer(
                    modifier = Modifier.height(20.dp)
                )

                Text(
                    text = "PhoneCast • Local wireless connection",
                    modifier = Modifier.fillMaxWidth(),
                    color = PhoneCastColors.MutedText,
                    fontSize = 9.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )

                Spacer(
                    modifier = Modifier.height(20.dp)
                )
            }
        }
    }
}

/*
 * =============================================================
 * STATUS CARD
 * =============================================================
 */

@Composable
private fun StatusCard() {

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(
                RoundedCornerShape(20.dp)
            )
            .background(
                Brush.horizontalGradient(
                    colors = listOf(
                        PhoneCastColors.Card,
                        PhoneCastColors.CardSecondary
                    )
                )
            )
            .border(
                width = 1.dp,
                color = PhoneCastColors.Border,
                shape = RoundedCornerShape(20.dp)
            )
            .padding(18.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {

        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(CircleShape)
                .background(
                    PhoneCastColors.SuccessBackground
                )
                .border(
                    width = 1.dp,
                    color = PhoneCastColors.Success.copy(
                        alpha = 0.35f
                    ),
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {

            Icon(
                imageVector = Icons.Default.Wifi,
                contentDescription = null,
                tint = PhoneCastColors.Success,
                modifier = Modifier.size(23.dp)
            )
        }

        Spacer(
            modifier = Modifier.width(14.dp)
        )

        Column(
            modifier = Modifier.weight(1f)
        ) {

            Text(
                text = "READY",
                color = PhoneCastColors.Success,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.2.sp
            )

            Spacer(
                modifier = Modifier.height(4.dp)
            )

            Text(
                text = "PhoneCast is ready to receive connections",
                color = PhoneCastColors.PrimaryText,
                fontSize = 12.sp
            )

            Spacer(
                modifier = Modifier.height(3.dp)
            )

            Text(
                text = "Visible to devices on your local network",
                color = PhoneCastColors.SecondaryText,
                fontSize = 9.sp
            )
        }
    }
}

/*
 * =============================================================
 * QUICK ACTION
 * =============================================================
 */

@Composable
private fun QuickAction(
    modifier: Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String
) {

    Column(
        modifier = modifier
            .height(92.dp)
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
            .padding(12.dp),
        verticalArrangement = Arrangement.Center
    ) {

        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = PhoneCastColors.NeonBlue,
            modifier = Modifier.size(20.dp)
        )

        Spacer(
            modifier = Modifier.height(8.dp)
        )

        Text(
            text = title,
            color = PhoneCastColors.PrimaryText,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold
        )

        Text(
            text = subtitle,
            color = PhoneCastColors.MutedText,
            fontSize = 8.sp
        )
    }
}

/*
 * =============================================================
 * NO REQUESTS
 * =============================================================
 */

@Composable
private fun NoRequestsCard() {

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(190.dp)
            .clip(
                RoundedCornerShape(18.dp)
            )
            .background(
                PhoneCastColors.Card
            )
            .border(
                width = 1.dp,
                color = PhoneCastColors.Border,
                shape = RoundedCornerShape(18.dp)
            ),
        contentAlignment = Alignment.Center
    ) {

        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {

            Image(
                painter = painterResource(
                    id = R.drawable.requests
                ),
                contentDescription = "No connection requests",
                modifier = Modifier
                    .size(105.dp),
                contentScale = ContentScale.Fit
            )

            Spacer(
                modifier = Modifier.height(7.dp)
            )

            Text(
                text = "No Requests",
                color = PhoneCastColors.PrimaryText,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(
                modifier = Modifier.height(3.dp)
            )

            Text(
                text = "Connection requests will appear here",
                color = PhoneCastColors.MutedText,
                fontSize = 9.sp
            )
        }
    }
}

/*
 * =============================================================
 * CONNECTION REQUEST
 * =============================================================
 */

@Composable
private fun ConnectionRequestCard(
    request: ConnectionRequest,
    onAccept: () -> Unit,
    onReject: () -> Unit
) {

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(
                RoundedCornerShape(18.dp)
            )
            .background(
                PhoneCastColors.Card
            )
            .border(
                width = 1.dp,
                color = PhoneCastColors.BorderBlue.copy(
                    alpha = 0.7f
                ),
                shape = RoundedCornerShape(18.dp)
            )
            .padding(16.dp)
    ) {

        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {

            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(13.dp))
                    .background(
                        PhoneCastColors.DarkBlue
                    ),
                contentAlignment = Alignment.Center
            ) {

                Icon(
                    imageVector = Icons.Default.Devices,
                    contentDescription = null,
                    tint = PhoneCastColors.NeonBlue,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(
                modifier = Modifier.width(12.dp)
            )

            Column(
                modifier = Modifier.weight(1f)
            ) {

                Text(
                    text = request.laptopName,
                    color = PhoneCastColors.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(
                    modifier = Modifier.height(3.dp)
                )

                Text(
                    text = "Wants to connect for screen sharing",
                    color = PhoneCastColors.SecondaryText,
                    fontSize = 10.sp
                )
            }

            Box(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(
                        PhoneCastColors.WarningBackground
                    )
                    .padding(
                        horizontal = 7.dp,
                        vertical = 4.dp
                    )
            ) {

                Text(
                    text = "NEW",
                    color = PhoneCastColors.Warning,
                    fontSize = 8.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(
            modifier = Modifier.height(15.dp)
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(9.dp)
        ) {

            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(43.dp)
                    .clip(
                        RoundedCornerShape(13.dp)
                    )
                    .background(
                        PhoneCastColors.ErrorBackground
                    )
                    .border(
                        width = 1.dp,
                        color = PhoneCastColors.Error.copy(
                            alpha = 0.35f
                        ),
                        shape = RoundedCornerShape(13.dp)
                    )
                    .clickable {
                        onReject()
                    },
                contentAlignment = Alignment.Center
            ) {

                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {

                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = null,
                        tint = PhoneCastColors.Error,
                        modifier = Modifier.size(17.dp)
                    )

                    Spacer(
                        modifier = Modifier.width(6.dp)
                    )

                    Text(
                        text = "REJECT",
                        color = PhoneCastColors.Error,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(43.dp)
                    .clip(
                        RoundedCornerShape(13.dp)
                    )
                    .background(
                        PhoneCastColors.NeonBlue
                    )
                    .clickable {
                        onAccept()
                    },
                contentAlignment = Alignment.Center
            ) {

                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {

                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(17.dp)
                    )

                    Spacer(
                        modifier = Modifier.width(6.dp)
                    )

                    Text(
                        text = "ACCEPT",
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

/*
 * =============================================================
 * HISTORY CARD
 * =============================================================
 */

@Composable
private fun HistoryCard(
    history: PhoneCastDatabase.ConnectionHistory
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
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {

        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(13.dp))
                .background(
                    PhoneCastColors.DarkBlue
                ),
            contentAlignment = Alignment.Center
        ) {

            Image(
                painter = painterResource(
                    id = R.drawable.laptop
                ),
                contentDescription = "Laptop",
                modifier = Modifier.size(32.dp),
                contentScale = ContentScale.Fit
            )
        }

        Spacer(
            modifier = Modifier.width(12.dp)
        )

        Column(
            modifier = Modifier.weight(1f)
        ) {

            Text(
                text = history.laptopName,
                color = PhoneCastColors.PrimaryText,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(
                modifier = Modifier.height(3.dp)
            )

            Text(
                text = history.formattedTime,
                color = PhoneCastColors.SecondaryText,
                fontSize = 9.sp
            )
        }

        Box(
            modifier = Modifier
                .clip(CircleShape)
                .background(
                    PhoneCastColors.SuccessBackground
                )
                .padding(
                    horizontal = 8.dp,
                    vertical = 5.dp
                )
        ) {

            Text(
                text = "CONNECTED",
                color = PhoneCastColors.Success,
                fontSize = 7.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.4.sp
            )
        }
    }
}

/*
 * =============================================================
 * EMPTY HISTORY
 * =============================================================
 */

@Composable
private fun EmptyHistoryCard() {

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(90.dp)
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
            ),
        contentAlignment = Alignment.Center
    ) {

        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {

            Text(
                text = "No connections yet",
                color = PhoneCastColors.PrimaryText,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(
                modifier = Modifier.height(3.dp)
            )

            Text(
                text = "Your connection history will appear here",
                color = PhoneCastColors.MutedText,
                fontSize = 8.sp
            )
        }
    }
}