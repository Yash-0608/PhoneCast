package com.phonecast.app.network

import android.util.Log
import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.io.PrintWriter
import java.net.ServerSocket
import java.net.Socket
import java.nio.charset.StandardCharsets
import java.util.concurrent.Executors

class PhoneCastServer(
    private val onClientConnected: (Socket) -> Unit,
    private val onMessageReceived: (
        String,
        Socket,
        PrintWriter
    ) -> Unit
) {

    companion object {

        private const val TAG =
            "PhoneCastServer"
    }


    private var serverSocket:
            ServerSocket? = null


    private val executor =
        Executors.newCachedThreadPool()


    @Volatile
    private var running =
        false


    var port: Int = -1
        private set


    // ========================================================
    // START SERVER
    // ========================================================

    fun start() {

        if (running) {
            return
        }


        executor.execute {

            try {

                /*
                 * Port 0 means Android selects
                 * an available port.
                 */

                serverSocket =
                    ServerSocket(0)


                port =
                    serverSocket!!.localPort


                running =
                    true


                Log.d(
                    TAG,
                    "Server started on port $port"
                )


                while (running) {

                    val socket =
                        serverSocket!!.accept()


                    Log.d(
                        TAG,
                        "Client connected: " +
                                "${socket.inetAddress.hostAddress}"
                    )

                    socket.tcpNoDelay = true
                    socket.keepAlive = true

                    onClientConnected(
                        socket
                    )


                    handleClient(
                        socket
                    )
                }

            } catch (e: Exception) {

                if (running) {

                    Log.e(
                        TAG,
                        "Server error",
                        e
                    )
                }

            } finally {

                running =
                    false
            }
        }
    }


    // ========================================================
    // HANDLE CLIENT
    // ========================================================

    private fun handleClient(
        socket: Socket
    ) {

        executor.execute {

            try {

                val reader =
                    BufferedReader(
                        InputStreamReader(
                            socket.getInputStream(),
                            StandardCharsets.UTF_8
                        )
                    )


                val writer =
                    PrintWriter(
                        BufferedWriter(
                            OutputStreamWriter(
                                socket.getOutputStream(),
                                StandardCharsets.UTF_8
                            )
                        ),
                        true
                    )


                while (
                    running &&
                    !socket.isClosed
                ) {

                    val message =
                        reader.readLine()
                            ?: break


                    Log.d(
                        TAG,
                        "Received: $message"
                    )


                    onMessageReceived(

                        message,

                        socket,

                        writer
                    )

                    Log.d(
                        TAG,
                        "Processed control message for " +
                                "${socket.inetAddress.hostAddress}"
                    )
                }

            } catch (e: Exception) {

                Log.e(
                    TAG,
                    "Client error",
                    e
                )

            } finally {

                try {

                    socket.close()

                } catch (_: Exception) {
                }


                Log.d(
                    TAG,
                    "Client disconnected"
                )
            }
        }
    }


    // ========================================================
    // SEND MESSAGE
    // ========================================================

    fun send(
        writer: PrintWriter,
        message: String
    ) {

        synchronized(writer) {
            writer.println(message)
            writer.flush()
        }


        Log.d(
            TAG,
            "Sent: $message"
        )
    }


    // ========================================================
    // STOP SERVER
    // ========================================================

    fun stop() {

        running =
            false


        try {

            serverSocket?.close()

        } catch (_: Exception) {
        }


        serverSocket =
            null


        port =
            -1


        Log.d(
            TAG,
            "Server stopped"
        )
    }
}