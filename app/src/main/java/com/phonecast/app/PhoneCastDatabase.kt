package com.phonecast.app

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class PhoneCastDatabase(
    context: Context
) : SQLiteOpenHelper(
    context,
    DATABASE_NAME,
    null,
    DATABASE_VERSION
) {

    companion object {

        private const val DATABASE_NAME =
            "phonecast.db"

        private const val DATABASE_VERSION =
            1

        private const val TABLE_PROFILE =
            "profile"

        private const val TABLE_HISTORY =
            "connection_history"
    }

    override fun onCreate(
        db: SQLiteDatabase
    ) {

        db.execSQL(
            """
            CREATE TABLE $TABLE_PROFILE (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL
            )
            """.trimIndent()
        )

        db.execSQL(
            """
            CREATE TABLE $TABLE_HISTORY (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                laptop_name TEXT NOT NULL,
                connected_at INTEGER NOT NULL
            )
            """.trimIndent()
        )
    }

    override fun onUpgrade(
        db: SQLiteDatabase,
        oldVersion: Int,
        newVersion: Int
    ) {

        db.execSQL(
            "DROP TABLE IF EXISTS $TABLE_PROFILE"
        )

        db.execSQL(
            "DROP TABLE IF EXISTS $TABLE_HISTORY"
        )

        onCreate(db)
    }

    fun saveUser(
        name: String
    ) {

        val values =
            ContentValues().apply {

                put(
                    "id",
                    1
                )

                put(
                    "name",
                    name
                )
            }

        writableDatabase.insertWithOnConflict(
            TABLE_PROFILE,
            null,
            values,
            SQLiteDatabase.CONFLICT_REPLACE
        )
    }

    fun getUserName(): String? {

        val cursor =
            readableDatabase.query(
                TABLE_PROFILE,
                arrayOf("name"),
                "id = ?",
                arrayOf("1"),
                null,
                null,
                null,
                "1"
            )

        cursor.use {

            if (it.moveToFirst()) {

                return it.getString(
                    it.getColumnIndexOrThrow(
                        "name"
                    )
                )
            }
        }

        return null
    }

    fun addConnection(
        laptopName: String
    ) {

        val values =
            ContentValues().apply {

                put(
                    "laptop_name",
                    laptopName
                )

                put(
                    "connected_at",
                    System.currentTimeMillis()
                )
            }

        writableDatabase.insert(
            TABLE_HISTORY,
            null,
            values
        )
    }

    fun getConnectionHistory():
            List<ConnectionHistory> {

        val result =
            mutableListOf<ConnectionHistory>()

        val cursor =
            readableDatabase.query(
                TABLE_HISTORY,
                arrayOf(
                    "id",
                    "laptop_name",
                    "connected_at"
                ),
                null,
                null,
                null,
                null,
                "connected_at DESC"
            )

        cursor.use {

            while (it.moveToNext()) {

                val id =
                    it.getLong(
                        it.getColumnIndexOrThrow(
                            "id"
                        )
                    )

                val laptopName =
                    it.getString(
                        it.getColumnIndexOrThrow(
                            "laptop_name"
                        )
                    )

                val connectedAt =
                    it.getLong(
                        it.getColumnIndexOrThrow(
                            "connected_at"
                        )
                    )

                result.add(
                    ConnectionHistory(
                        id = id,
                        laptopName = laptopName,
                        connectedAt = connectedAt
                    )
                )
            }
        }

        return result
    }

    data class ConnectionHistory(
        val id: Long,
        val laptopName: String,
        val connectedAt: Long
    ) {

        val formattedTime: String
            get() {

                val formatter =
                    SimpleDateFormat(
                        "dd MMM yyyy, hh:mm a",
                        Locale.getDefault()
                    )

                return formatter.format(
                    Date(connectedAt)
                )
            }
    }
}