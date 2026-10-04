package com.phonecast.app.network

data class ConnectionRequest(
    val requestId: String,
    val laptopName: String,
    val message: String
)