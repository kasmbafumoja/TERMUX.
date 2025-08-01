import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys"
import P from "pino"
import readline from "readline"

async function connectBot() {
    const { state, saveCreds } = await useMultiFileAuthState("./auth_info")
    const { version } = await fetchLatestBaileysVersion()
    const sock = makeWASocket({
        version,
        printQRInTerminal: true, // Affiche QR si on veut
        auth: state,
        logger: P({ level: "silent" })
    })

    // Sauvegarder les sessions
    sock.ev.on("creds.update", saveCreds)

    // Fonction pairing code
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (connection === "open") {
            console.log("✅ Connecté à WhatsApp avec succès !")
        }

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401
            console.log("❌ Déconnecté. Reconnexion :", shouldReconnect)
            if (shouldReconnect) connectBot()
        }

        if (qr) {
            console.log("📷 Scanne ce QR pour te connecter !")
        }
    })

    // Génération code pairing
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question("📌 Tape ton numéro WhatsApp (avec code pays) : ", async (phoneNumber) => {
        try {
            const code = await sock.requestPairingCode(phoneNumber)
            console.log(`✅ Utilise ce code sur ton WhatsApp : ${code}`)
        } catch (err) {
            console.error("⚠️ Erreur lors de la génération du code :", err)
        }
        rl.close()
    })
}

connect
