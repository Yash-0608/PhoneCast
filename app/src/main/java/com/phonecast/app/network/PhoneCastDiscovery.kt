package com.phonecast.app.network

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.util.Log

class PhoneCastDiscovery(
    context: Context
) {

    companion object {

        private const val TAG =
            "PhoneCastDiscovery"

        private const val SERVICE_TYPE =
            "_phonecast._tcp"
    }


    private val appContext =
        context.applicationContext


    private val nsdManager =
        appContext.getSystemService(
            Context.NSD_SERVICE
        ) as NsdManager


    private val wifiManager =
        appContext.getSystemService(
            Context.WIFI_SERVICE
        ) as WifiManager


    private var registrationListener:
            NsdManager.RegistrationListener? =
            null


    private var multicastLock:
            WifiManager.MulticastLock? =
            null


    private var isRegistered =
        false


    private var isRegistering =
        false


    // ========================================================
    // REGISTER PHONECAST SERVICE
    // ========================================================

    @Synchronized
    fun register(
        port: Int
    ) {

        Log.d(
            TAG,
            "================================================"
        )

        Log.d(
            TAG,
            "Starting PhoneCast NSD registration"
        )

        Log.d(
            TAG,
            "Requested port: $port"
        )


        if (port <= 0) {

            Log.e(
                TAG,
                "Cannot register PhoneCast: invalid port $port"
            )

            return
        }


        // ----------------------------------------------------
        // PREVENT DUPLICATE REGISTRATION
        // ----------------------------------------------------

        if (
            isRegistered ||
            isRegistering
        ) {

            Log.d(
                TAG,
                "PhoneCast service is already registered/registering."
            )

            return
        }


        // ----------------------------------------------------
        // ACQUIRE WIFI MULTICAST LOCK
        // ----------------------------------------------------

        try {

            if (
                multicastLock == null ||
                !multicastLock!!.isHeld
            ) {

                multicastLock =
                    wifiManager
                        .createMulticastLock(
                            "PhoneCastMulticastLock"
                        )
                        .apply {

                            setReferenceCounted(
                                false
                            )

                            acquire()
                        }


                Log.d(
                    TAG,
                    "Wi-Fi multicast lock acquired."
                )
            }

        } catch (
            exception: Exception
        ) {

            Log.e(
                TAG,
                "Failed to acquire Wi-Fi multicast lock.",
                exception
            )
        }


        // ----------------------------------------------------
        // CREATE SERVICE NAME
        // ----------------------------------------------------

        val deviceName =
            Build.MODEL
                .replace(
                    Regex("[^A-Za-z0-9._-]"),
                    "-"
                )
                .ifBlank {
                    "Android"
                }


        val serviceName =
            "PhoneCast-$deviceName"


        Log.d(
            TAG,
            "Service name: $serviceName"
        )

        Log.d(
            TAG,
            "Service type: $SERVICE_TYPE"
        )

        Log.d(
            TAG,
            "Service port: $port"
        )


        // ----------------------------------------------------
        // CREATE NSD SERVICE INFO
        // ----------------------------------------------------

        val serviceInfo =
            NsdServiceInfo().apply {

                /*
                 * IMPORTANT:
                 *
                 * `serviceName` on the left is the
                 * NsdServiceInfo property.
                 *
                 * `serviceName` on the right is our
                 * local Kotlin variable.
                 *
                 * `this.` prevents the name collision.
                 */
                this.serviceName =
                    serviceName


                this.serviceType =
                    SERVICE_TYPE


                this.port =
                    port


                // ------------------------------------------------
                // OPTIONAL PHONECAST TXT ATTRIBUTES
                // ------------------------------------------------

                if (
                    Build.VERSION.SDK_INT >=
                    Build.VERSION_CODES.LOLLIPOP
                ) {

                    setAttribute(
                        "app",
                        "PhoneCast"
                    )


                    setAttribute(
                        "version",
                        "1"
                    )


                    setAttribute(
                        "device",
                        Build.MODEL
                    )
                }
            }


        // ----------------------------------------------------
        // REGISTRATION LISTENER
        // ----------------------------------------------------

        val listener =
            object :
                NsdManager.RegistrationListener {


                override fun onServiceRegistered(
                    registeredServiceInfo:
                        NsdServiceInfo
                ) {

                    isRegistering =
                        false

                    isRegistered =
                        true

                    registrationListener =
                        this


                    Log.d(
                        TAG,
                        "================================================"
                    )


                    Log.d(
                        TAG,
                        "PHONECAST NSD SERVICE REGISTERED"
                    )


                    Log.d(
                        TAG,
                        "Actual service name: " +
                                registeredServiceInfo.serviceName
                    )


                    Log.d(
                        TAG,
                        "Service type: " +
                                registeredServiceInfo.serviceType
                    )


                    Log.d(
                        TAG,
                        "Port: " +
                                registeredServiceInfo.port
                    )


                    Log.d(
                        TAG,
                        "PhoneCast is now discoverable on the LAN."
                    )


                    Log.d(
                        TAG,
                        "================================================"
                    )
                }


                override fun onRegistrationFailed(
                    failedServiceInfo:
                        NsdServiceInfo,

                    errorCode: Int
                ) {

                    isRegistering =
                        false

                    isRegistered =
                        false

                    registrationListener =
                        null


                    Log.e(
                        TAG,
                        "================================================"
                    )


                    Log.e(
                        TAG,
                        "PHONECAST NSD REGISTRATION FAILED"
                    )


                    Log.e(
                        TAG,
                        "Service name: " +
                                failedServiceInfo.serviceName
                    )


                    Log.e(
                        TAG,
                        "Service type: " +
                                failedServiceInfo.serviceType
                    )


                    Log.e(
                        TAG,
                        "Port: " +
                                failedServiceInfo.port
                    )


                    Log.e(
                        TAG,
                        "NSD error code: $errorCode"
                    )


                    Log.e(
                        TAG,
                        "================================================"
                    )


                    releaseMulticastLock()
                }


                override fun onServiceUnregistered(
                    unregisteredServiceInfo:
                        NsdServiceInfo
                ) {

                    isRegistering =
                        false

                    isRegistered =
                        false

                    registrationListener =
                        null


                    Log.d(
                        TAG,
                        "PhoneCast NSD service unregistered."
                    )


                    releaseMulticastLock()
                }


                override fun onUnregistrationFailed(
                    failedServiceInfo:
                        NsdServiceInfo,

                    errorCode: Int
                ) {

                    isRegistered =
                        false

                    isRegistering =
                        false

                    registrationListener =
                        null


                    Log.e(
                        TAG,
                        "NSD unregistration failed: " +
                                errorCode
                    )


                    releaseMulticastLock()
                }
            }


        registrationListener =
            listener

        isRegistering =
            true


        // ----------------------------------------------------
        // REGISTER WITH ANDROID NSD
        // ----------------------------------------------------

        try {

            nsdManager.registerService(
                serviceInfo,
                NsdManager.PROTOCOL_DNS_SD,
                listener
            )


            Log.d(
                TAG,
                "NsdManager.registerService() called successfully."
            )

        } catch (
            exception: Exception
        ) {

            isRegistering =
                false

            isRegistered =
                false

            registrationListener =
                null


            Log.e(
                TAG,
                "Exception while registering PhoneCast NSD service.",
                exception
            )


            releaseMulticastLock()
        }
    }


    // ========================================================
    // UNREGISTER
    // ========================================================

    @Synchronized
    fun unregister() {

        Log.d(
            TAG,
            "Stopping PhoneCast NSD advertisement..."
        )


        val listener =
            registrationListener


        if (listener != null) {

            try {

                nsdManager.unregisterService(
                    listener
                )


                Log.d(
                    TAG,
                    "NSD unregisterService() called."
                )

            } catch (
                exception: Exception
            ) {

                Log.e(
                    TAG,
                    "Failed to unregister PhoneCast service.",
                    exception
                )
            }
        }


        registrationListener =
            null

        isRegistered =
            false

        isRegistering =
            false


        releaseMulticastLock()
    }


    // ========================================================
    // RELEASE MULTICAST LOCK
    // ========================================================

    private fun releaseMulticastLock() {

        try {

            multicastLock?.let {

                if (it.isHeld) {

                    it.release()


                    Log.d(
                        TAG,
                        "Wi-Fi multicast lock released."
                    )
                }
            }

        } catch (
            exception: Exception
        ) {

            Log.e(
                TAG,
                "Failed to release multicast lock.",
                exception
            )
        }


        multicastLock =
            null
    }
}