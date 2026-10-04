const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class PhoneCastStorage {
    constructor(userDataPath) {
        this.userDataPath = userDataPath;

        this.storageDirectory = path.join(
            userDataPath,
            "phonecast"
        );

        this.storageFile = path.join(
            this.storageDirectory,
            "account.json"
        );

        this.ensureStorage();
    }

    ensureStorage() {
        try {
            if (!fs.existsSync(this.storageDirectory)) {
                fs.mkdirSync(
                    this.storageDirectory,
                    {
                        recursive: true
                    }
                );
            }

            if (!fs.existsSync(this.storageFile)) {
                this.writeData({
                    accountCreated: false,
                    laptopName: "",
                    passwordHash: "",
                    passwordSalt: "",
                    connectionHistory: []
                });
            }
        } catch (error) {
            console.error(
                "PhoneCast storage initialization failed:",
                error
            );

            throw error;
        }
    }

    readData() {
        try {
            if (!fs.existsSync(this.storageFile)) {
                this.ensureStorage();
            }

            const rawData =
                fs.readFileSync(
                    this.storageFile,
                    "utf-8"
                );

            if (!rawData.trim()) {
                return {
                    accountCreated: false,
                    laptopName: "",
                    passwordHash: "",
                    passwordSalt: "",
                    connectionHistory: []
                };
            }

            return JSON.parse(rawData);
        } catch (error) {
            console.error(
                "Failed to read PhoneCast storage:",
                error
            );

            throw error;
        }
    }

    writeData(data) {
        try {
            fs.writeFileSync(
                this.storageFile,
                JSON.stringify(
                    data,
                    null,
                    4
                ),
                "utf-8"
            );
        } catch (error) {
            console.error(
                "Failed to write PhoneCast storage:",
                error
            );

            throw error;
        }
    }

    accountExists() {
        const data = this.readData();

        return (
            data.accountCreated === true &&
            typeof data.laptopName === "string" &&
            data.laptopName.trim().length > 0
        );
    }

    getAccount() {
        const data = this.readData();

        return {
            accountCreated:
                data.accountCreated === true,

            laptopName:
                data.laptopName || "",

            connectionHistory:
                Array.isArray(data.connectionHistory)
                    ? data.connectionHistory
                    : []
        };
    }

    createAccount(
        laptopName,
        password
    ) {
        const cleanedName =
            String(laptopName || "").trim();

        const cleanedPassword =
            String(password || "");

        if (!cleanedName) {
            throw new Error(
                "Laptop name cannot be empty."
            );
        }

        if (!this.isValidPassword(cleanedPassword)) {
            throw new Error(
                "Password does not meet PhoneCast requirements."
            );
        }

        const salt =
            crypto.randomBytes(16).toString("hex");

        const passwordHash =
            this.hashPassword(
                cleanedPassword,
                salt
            );

        const data = {
            accountCreated: true,

            laptopName:
                cleanedName,

            passwordHash:
                passwordHash,

            passwordSalt:
                salt,

            connectionHistory: []
        };

        this.writeData(data);

        return {
            success: true,
            laptopName: cleanedName
        };
    }

    validatePassword(password) {
        const data = this.readData();

        if (
            !data.passwordHash ||
            !data.passwordSalt
        ) {
            return false;
        }

        const hash =
            this.hashPassword(
                String(password || ""),
                data.passwordSalt
            );

        return crypto.timingSafeEqual(
            Buffer.from(hash, "hex"),
            Buffer.from(
                data.passwordHash,
                "hex"
            )
        );
    }

    hashPassword(
        password,
        salt
    ) {
        return crypto
            .scryptSync(
                password,
                salt,
                64
            )
            .toString("hex");
    }

    isValidPassword(password) {
        if (typeof password !== "string") {
            return false;
        }

        /*
         * PhoneCast laptop password rules:
         *
         * 1. Minimum 8 characters
         * 2. Must start with alphabet
         * 3. Only letters, numbers and underscore
         * 4. No spaces
         * 5. No other special characters
         */

        const passwordPattern =
            /^[A-Za-z][A-Za-z0-9_]{7,}$/;

        return passwordPattern.test(
            password
        );
    }

    addConnectionHistory(
        phoneName,
        deviceModel,
        status = "Connected"
    ) {
        const data =
            this.readData();

        if (
            !Array.isArray(
                data.connectionHistory
            )
        ) {
            data.connectionHistory = [];
        }

        const historyEntry = {
            id:
                `${Date.now()}-${Math.random()
                    .toString(36)
                    .substring(2, 8)}`,

            phoneName:
                phoneName || "Unknown",

            deviceModel:
                deviceModel || "Unknown Device",

            status:
                status || "Connected",

            timestamp:
                Date.now()
        };

        data.connectionHistory.unshift(
            historyEntry
        );

        /*
         * Keep the local history reasonably sized.
         * The newest 100 records are retained.
         */
        data.connectionHistory =
            data.connectionHistory.slice(
                0,
                100
            );

        this.writeData(data);

        return historyEntry;
    }

    getConnectionHistory() {
        const data =
            this.readData();

        if (
            !Array.isArray(
                data.connectionHistory
            )
        ) {
            return [];
        }

        return data.connectionHistory;
    }

    clearConnectionHistory() {
        const data =
            this.readData();

        data.connectionHistory = [];

        this.writeData(data);

        return {
            success: true
        };
    }

    resetAccount() {
        this.writeData({
            accountCreated: false,
            laptopName: "",
            passwordHash: "",
            passwordSalt: "",
            connectionHistory: []
        });

        return {
            success: true
        };
    }
}

module.exports = PhoneCastStorage;