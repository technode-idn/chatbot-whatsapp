import pkg from 'whatsapp-web.js';
import nodeCron from 'node-cron';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from "qrcode-terminal";
import puppeteer from 'puppeteer';
import Logger from "./chatbot-structure/system/security/logger.js";
import SystemMonitor from './chatbot-structure/system/security/monitor.js';
import { exportData } from './chatbot-structure/system/exportData.js';
import { faq } from './chatbot-structure/system/FAQ.js';
import { extractionOrder } from './chatbot-structure/system/ordering/extractionOrder.js';
import { sendProofToGroup } from './chatbot-structure/system/broadcasting/sendProof.js';
import { payment } from './chatbot-structure/system/payment.js';
import { ongkir } from './chatbot-structure/system/ongkir.js';
import { paymentVerificationSession, pendingProof, sessions, paymentStatus, orderConfirmationSession, groupSession, deliverySession, multipleFormSession, editingOrder as editingOrderSession, pendingOrders, userMode, allNumberOwnerTenant, formTenantSession } from './chatbot-structure/settings/globalVariables.js';
import { verificationPayment } from './chatbot-structure/system/verification.js';
import { handleDeliveryResponse, inputDelivery } from './chatbot-structure/system/broadcasting/sendDelivery.js';
import { generateFormMultipleOrder } from './chatbot-structure/system/ordering/generateFormMultipleOrder.js';
import { deleteOrder } from './chatbot-structure/system/ordering/deleteOrder.js';
import { cancelOrder, validationOrder } from './chatbot-structure/system/ordering/validationOrder.js';
import { editingOrder as sendEditingOrderForm } from './chatbot-structure/system/ordering/editingOrder.js';
import { handleOrderConfirmation } from './chatbot-structure/system/ordering/editOrder.js';
import { broadcastMenu, generateFormStock, validationFormStock } from './chatbot-structure/system/owner-tenant/broadcastForm.js';
import { displayStock, editStock, resetStock } from './chatbot-structure/system/owner-tenant/stock.js';
import { getResponse, initializeResponse } from './chatbot-structure/system/security/response.js';
import { getActiveCustomerIds, restoreRuntimeSessions, saveRuntimeSessions } from './chatbot-structure/system/security/runtimeSession.js';
import { generalSalesReport } from './chatbot-structure/system/broadcasting/generalSalesReport.js';
import { extraction } from './chatbot-structure/system/owner-tenant/extraction.js';

// Membuat Settingan Whatsapp Web
// ==============================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        headless: true
    }
});

// Inisialisasi Logger
// ===================
const logger = new Logger();

// Inisialisasi Sistem Monitor
// ===========================
const monitor = new SystemMonitor(client, logger);

// Inisialisasi Response
// =====================
initializeResponse(client, logger);

// Mengambil Instance Response
// ===========================
const response = getResponse();

const restoredSession = await monitor.guardians.session.load();
restoreRuntimeSessions(restoredSession);

let recoveryFollowUpSent = false;

async function saveSessionBeforeExit() {
    await saveRuntimeSessions(monitor.guardians.session);
}

process.once("SIGINT", async () => {
    await saveSessionBeforeExit();
    process.exit(0);
});

process.once("SIGTERM", async () => {
    await saveSessionBeforeExit();
    process.exit(0);
});

client.on("ready", async () => {
    if(recoveryFollowUpSent) {
        return;
    }

    recoveryFollowUpSent = true;

    for(const customerId of getActiveCustomerIds()) {
        await response.send(
            customerId,
            "Mohon maaf, sepertinya sempat ada gangguan sistem. Silahkan lanjutkan kembali aktivitas anda.",
            "high"
        );
    }
});

// Menyimpan Session Users
// =======================
const welcomedUsers = new Set();
const welcomedTenant = new Set();

function isAvailabilityResponse(text) {
    const hasOrderId = /^\s*order id\s*:/im.test(text);
    const hasStatusProduk = /^\s*status produk(?:\s+\d+)?\s*:/im.test(text);

    return (
        hasOrderId &&
        (text.toLowerCase().includes('pesanan') || hasStatusProduk)
    );
}

function isPaymentResponse(text) {
    const hasOrderId = /^\s*order id\s*(?::|->)/im.test(text);
    const hasPaymentStatus = /^\s*(?:\|\s*)?status\s*(?::|->)/im.test(text);

    return (
        hasOrderId &&
        (text.toLowerCase().includes('pembayaran') || hasPaymentStatus)
    );
}

function isDeliveryResponse(text) {
    const hasOrderId = /^\s*order id\s*(?::|->)/im.test(text);
    const hasDeliveryField = /^\s*id pengirim\s*(?::|->)/im.test(text)
        || /^\s*nama pengirim\s*(?::|->)/im.test(text)
        || /^\s*nomor pengirim\s*(?::|->)/im.test(text);

    return (
        hasDeliveryField ||
        (hasOrderId && text.toLowerCase().includes('pengiriman'))
    );
}

function isPaymentDecision(text) {
    const rawText = String(text || '').trim();
    const firstLine = rawText
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(Boolean);
    const statusMatch = rawText.match(/^\s*(?:\|\s*)?status(?:\s+pembayaran)?\s*(?::|->)\s*(.+)$/im);
    const knownStatuses = [
        'ok',
        'oke',
        'valid',
        'sesuai',
        'benar',
        'lunas',
        'ya',
        'yes',
        'y',
        'done',
        'paid',
        'sudah',
        'berhasil',
        'x',
        'no',
        'n',
        'tidak',
        'invalid',
        'gagal',
        'salah',
        'batal'
    ];

    return [firstLine, statusMatch?.[1], rawText].some(candidate => {
        const compactText = String(candidate || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

        return knownStatuses.includes(compactText);
    });
}

// Broadcasting Form Pengisian Stock Ke Setiap Owner Tenant (Broadcasting Form)
// ============================================================================
let statusBroadcast = true;

if(statusBroadcast) {
    nodeCron.schedule('0 7 * * 1', async() => {
        await broadcastMenu();
    });

    statusBroadcast = false;
}

// Broadcasting Laporan Penjualan (Sales Report Broadcasting)
// ==========================================================
nodeCron.schedule('0 16 * * 1-5', async() => {
    await generalSalesReport(client);
    await resetStock(false);
});

// Membaca Pesan Masuk
// ===================
client.on('message', async message => {
    try {
    const allowedNumbers = [
        '76403240386784@lid', // Fikri
        '249344376729705@lid', // Kakak
        '129454609268764@lid', // Ayah
        '77855006433494@lid', // Diaz
        '58493310615674@lid', // Azmi
        '98599765577810@lid', // Aliya
        '120363407187484870@g.us' // Group
    ]; // [X]

    // Melacak Siapa Pengirim & Isi Pesannya
    // ======================================
    logger.info(`FROM: ${message.from}`);
    logger.info(`MESSAGE: ${message.body}`);

    // Menyimpan Informasi Pengirim
    // ============================
    const userId = message.from;

    // Menyimpan Informasi Grup
    // ========================
    const isGroupMessage = userId.endsWith('@g.us');

    // Ekstraksi Pesan
    // ===============
    const text = message.body.trim();

    // Memeriksa Apakah Nomor Pengirim Terdapat Di Dalam Daftar
    // ========================================================
    if(!allowedNumbers.includes(userId) && !allNumberOwnerTenant.includes(userId)) {
        return;
    } // [X]

    // Memeriksa Apakah Pengirim Adalah Dirinya Sendiri
    // ================================================
    if(message.fromMe) {
        return;
    }

    // Memeriksa Apakah Pesan Yang Dikirim Berupa Media (Sticker, Gambar, Dokumen, Video)
    // ==================================================================================
    if(message.hasMedia) {
        if(pendingProof[userId]) {
            if(!message.hasMedia) {
                await response.send(userId, "Mohon kirimkan screenshot bukti pembayarannya kak.");
                return;
            }

            await response.send(userId, "Baik, sebentar ya kak. Kami cek dulu bukti pembayarannya 🙏");

            const proof_photo = await message.downloadMedia();
            const orderId = pendingProof[userId];
            const order = pendingOrders[orderId];

            if(!order?.data) {
                await response.send(userId, 'Data pesanan tidak ditemukan. Mohon hubungi admin.');
                return;
            }

            await sendProofToGroup(proof_photo, orderId, order.data, client);
            
            return;
        }

        return;
    }

    // Memeriksa & Menyimpan Data Pengirim, Jika Pertama Kalinya Berkunjung
    // ====================================================================
    if(!welcomedUsers.has(userId)) {
        welcomedUsers.add(userId);

        await response.send(userId, "Halo kak👋\n\nTerima kasih sudah menghubungi Klikbi Go🍽️🚚\n\nSaya admin KlikBiGo, ada yang bisa kami bantu? 😊\n[1] Pesan Produk\n[2] FAQ\n[3] Hubungi Admin"
        );

        return;
    } 

    // Handling Untuk Export File (Excel)
    // ==================================
    if(text === "export") {
        if(userId === "58493310615674@lid") {
            const allowed = await monitor.guardians.export.begin();

            if(!allowed){
                await response.send(userId, "Sedang ada proses export yang berjalan.");

                return;
            }

            try {

                await exportData();

                const media = MessageMedia.fromFilePath("./chatbot-structure/file/customer_recap.xlsx");

                await response.sendMedia(userId, media, "", "low");

                await monitor.guardians.export.finish(true);

            } catch(error) {

                logger.error(error);

                await monitor.guardians.export.finish(false);

            }

        }

    }

    // Handling Berpindah Menu
    // =======================
    if(text.toLocaleLowerCase() === "keluar" || text.toLocaleLowerCase() === "kembali") {
        delete sessions[userId];
        delete userMode[userId];
        delete sessions[userId];
        delete multipleFormSession[userId];
        delete editingOrderSession[userId];
        delete orderConfirmationSession[userId];
        delete paymentStatus[userId];
        delete pendingProof[userId];

        await response.send(userId, "Halo kak👋\n\nTerima kasih sudah menghubungi Klikbi Go🍽️🚚\n\nSaya admin KlikBiGo, ada yang bisa kami bantu? 😊\n[1] Pesan Produk\n[2] FAQ\n[3] Hubungi Admin"
        );
        
        return;
    }

    // Tenant (Tenant Session)
    // =======================
    if(allNumberOwnerTenant.includes(userId)) {
        if(formTenantSession["status"]) {
            const responseStock = await validationFormStock(text);
            await response.send(userId, responseStock);
            return;
        }

        if(!welcomedTenant.has(userId)) {
            welcomedTenant.add(userId);

            await response.send(userId, "🏪 Halo Pemilik Tenant!\n\nAda yang bisa kami bantu?\n[1] Isi Ulang Stok [2] Lihat Stok\n[3] Update/Restok Produk\n\n_Gunakan fitur dibawah jika hanya tidak ingin isi ulang stok harian_\n[4] Gunakan Stok Sisa Kemarin");

            return;
        } 

        switch(text) {
            case "1":
                await resetStock(true);
                await generateFormStock(userId);
                return;
            case "2":
                const responseDisplay = await displayStock(userId);
                await response.send(userId, responseDisplay);
                return;
            case "3":
                await response.send(userId, "*📝 SILAKAN PERBARUI STOK*\n=============================\nID Produk: \nJumlah Stok: \nStatus: \n\n_Status diisi dengan tambah/kurang/reset secara text_");
                return;
            case "PERBARUI":
                const responseStock = await extraction(text);
                await response.send(userId, responseStock);
                return;
            case "4":
                await response.send(userId, "Baik, stok sisa kemarin digunakan.");
                return;
            default:
                await response.send(userId, "Anda memilih pilihan diluar menu.");
        }
    }

    // Follow-Up Dari Group Tenant (Group Session)
    // ===========================================
    if(isGroupMessage) {
        if(!groupSession[userId]) {
            return;
        }

        if(paymentVerificationSession[userId] && isPaymentDecision(text)) {
            await verificationPayment(text, client, paymentVerificationSession[userId]);

            return;
        }

        if(isPaymentResponse(text)) {
            await verificationPayment(message.body, client);

            return;
        }

        if(deliverySession[userId] && isDeliveryResponse(text)) {
            await handleDeliveryResponse(text, client, deliverySession[userId]);

            return;
        }

        return;
    }

    // Peralihan chatbot -> admin manusia (Human Admin Session)
    // ========================================================
    if(userMode[userId] === "human-admin") {
        return;
    }

    // Menjalankan FAQ, Jika Pengirim Memilih Menu 2 (FAQ Session)
    // ===========================================================
    if(userMode[userId] === "faq") {
        const responseFaq = await faq(text);

        await response.send(userId, responseFaq);

        return;
    }

    // Menjalankan Sistem Pendataan Formulir, Jika Pengirim Memilih Menu 2 (Ordering Session)
    // ======================================================================================
    if(sessions[userId]) {
        if(!text.toLocaleLowerCase.includes("pesanannya")) {
            return response.send(userId, "Mohon untuk mengisi formulir pesanan kakak.");
        }

        const responseOrder = await extractionOrder(text, userId, false, client);        

        if(responseOrder) {
            await response.send(userId, responseOrder);
        }

        return;
    }

    // Pemilihan Metode Pemesanan, Single or Multiple (Form Session)
    // =============================================================
    if(userMode[userId] === "form") {
        if(text == "1") {
            await response.send(userId, "Baik kak, supaya kami bisa proses pesanannya, mohon info ya.\n\n📌Nama Pemesan: \n📌ID Produk: \n📌Jumlah Pesanan: \n📌Nomor Telepon Aktif: \n\n🏠 *TUJUAN PENGANTARAN*\n=============================\n_Tolong isi alamat pengantaran secara lengkap, jika berlokasi diluar SV IPB_\n\n- Jalan/Perumahan/Tempat + Nomor\n- Kelurahan/Desa\n- Kecamatan\n- Kota/Kabupaten\n\n*Cth: Jl. Lodaya II N0.15, Babakan, Bogor Tengah, Kota Bogor*\n\nIsi alamat Anda di bawah 👇\n📌Alamat Lengkap Pengantaran: \n\nTerima Kasih🙏😊\n\n*_*Jika ingin kembali, ketik 'keluar'_*"
            );

            sessions[userId] = true;

            delete userMode[userId];
        } else if(text == "2") {
            await response.send(userId, "Berapa produk yang ingin anda pesan?\n[1] 1\n[2] 2\n[3] 3\n[4] 4\n[5] 5");

            multipleFormSession[userId] = true;

            delete userMode[userId];
        } else {
            await response.send(userId, "Mohon maaf, sepertinya kakak memilih diluar pilihan yang ada. Silahkan pilih ulang kembali.");
        }

        return;
    }

    // Metode Pemesanan Multiple Order (Multiple Order Session)
    // ========================================================
    if(multipleFormSession[userId]) {
        if(Number(text) > 5) {
            await response.send(userId, "Mohon maaf, sepertinya jumlah produk yang ingin kakak pesan sudah diluar batas 🙏😊");
            return;
        }

        const responseForm = await generateFormMultipleOrder(text);

        await response.send(userId, responseForm);

        sessions[userId] = true;

        delete multipleFormSession[userId];

        return;
    }

    // Konfirmasi/Edit Pesanan Setelah Produk Tersedia
    // ===============================================
    if(orderConfirmationSession[userId]?.status) {
        await handleOrderConfirmation(text, userId);
        return;
    }

    // Mengganti/Edit, Jika Suatu Produk Tidak Tersedia (Editing Order Session)
    // ========================================================================
    if(editingOrderSession[userId]?.status) {
        const editSession = editingOrderSession[userId];

        if(text == "1") {
            await sendEditingOrderForm(editSession["all_data_available"], editSession["order_id"], userId, client);
        } else if(text == "2") {
            const remainingOrder = deleteOrder(editSession["all_data_available"], editSession["order_id"]);

            if(!remainingOrder?.hasProducts) {
                delete pendingOrders[editSession["order_id"]];
                delete editingOrderSession[userId];

                await response.send(userId, 'Pesanan dibatalkan karena tidak ada produk yang bisa diproses.');
                return;
            }

            await validationOrder(remainingOrder.data, userId, true, client);
            delete editingOrderSession[userId];
        } else {
            delete editingOrderSession[userId];
            await extractionOrder(text, userId, true, client);
        }

        return;
    }

    // Handling Pemilihan Metode Payment (Payment Session)
    // ===================================================
    if(paymentStatus[userId]?.status) {
        const paymentSession = paymentStatus[userId];
        const orderId = paymentSession["order_id"];
        const responsePayment = await payment(orderId);

        if(!responsePayment) {
            await response.send(userId, 'Data pembayaran belum ditemukan. Mohon coba lagi setelah pesanan dikonfirmasi.');
            return;
        }

        const responseOngkir = await ongkir(userId);
        const shippingCost = Number(responseOngkir) || 0;
        const totalPrice = Number(responsePayment["total_price"]) || 0;
        const totalPayment = totalPrice + shippingCost;

        if(text == "1") {
            await response.send(userId, 
                `Siap kak\n\nUntuk total pembayaran ${totalPayment}, sudah dengan ongkir sebesar ${shippingCost} ya kak, dilakukan secara cash saat pesanan diterima.\n\nPesanan akan segera kami proses 😊🙏🏻`
            );

            await response.send(userId, "Informasi pengirim akan dikirim dalam beberapa waktu...");

            await inputDelivery(orderId, client);

            delete pendingOrders[orderId];
        } else if(text == "2") {
            if(!responsePayment["qris_photo"]) {
                await response.send(userId, 'QRIS tenant belum ditemukan. Mohon pilih cash atau hubungi admin.');
                return;
            }

            const qris_photo = MessageMedia.fromFilePath(responsePayment["qris_photo"]);

            await response.sendMedia(
                userId, 
                qris_photo,
                `Total harga yang harus dibayar sejumlah *Rp ${totalPayment}*\n\nSudah ditambah dengan *ongkir ${shippingCost}* ya kak 🙏🏻\nMohon konfirmasi dan screenshot jika pembayaran sudah dilakukan.`
            );

            pendingProof[userId] = orderId;
        } else {
            await response.send(userId, 'Mohon pilih metode pembayaran:\n[1] Cash\n[2] QRIS');
            return;
        }

        delete paymentStatus[userId];

        return;
    }

    // Mengirimkan Informasi Pengirim Kepada Customer (Delivery Session)
    // =================================================================
    if(deliverySession[userId]) {
        const result = await handleDeliveryResponse(text, client);

        if(result?.message) {
            await response.send(userId, result.message);
        }

        return;
    }

    // Pengelolaan Pilihan Menu
    // ========================
    switch(text) {
        case "1":
            userMode[userId] = "form";

            await response.send(userId, "📝 *JENIS PEMESANAN ANDA*\n===========================\n[1] Single Order\n[2] Multiple Order");
            
            return;
        case "2":
            userMode[userId] = "faq";

            await response.send(userId, "🔍 *DAFTAR PERTANYAAN FAQ*\n=============================\n\n[1] KlikBi-Go Jual Apa Saja?\n\n[2] Bagaimana Cara Memesan?\n\n[3] Kapan Waktu Operasionalnya?\n\n[4] Apakah Pesanan Bisa Di Antar?\n\n[5] Metode Pembayarannya Apa Saja?\n\n*_Ketik 'keluar' untuk kembali ke menu awal_*");

            return;
        case "3":
            userMode[userId] = "human-admin";

            await response.send(userId, "Terima kasih telah menghubungi, selanjutnya admin kami akan membantu kakak secara langsung 🙏🏻\n\nSilakan ajukan pertanyaan atau informasi yang ingin disampaikan.\n\n*_Ketik 'kembali' untuk kembali ke chatbot_*");

            return;
        default:
            await response.send(userId, "Mohon maaf, sepertinya kakak memilih diluar pilihan yang ada.\n\nSilahkan pilih ulang menu kembali.");
    }
    } finally {
        await saveRuntimeSessions(monitor.guardians.session);
    }
});

// Menjalankan Sistem Monitor
// ==========================
monitor.start();

// Inisialisasi Chatbot
// ====================
client.initialize();
