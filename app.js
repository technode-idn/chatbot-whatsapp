import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from "qrcode-terminal";
import puppeteer from 'puppeteer';
import { exportData } from './chatbot-structure/system/exportData.js';
import { faq } from './chatbot-structure/system/FAQ.js';
import { extractionOrder } from './chatbot-structure/system/ordering/extractionOrder.js';
import { sendProofToGroup } from './chatbot-structure/system/broadcasting/sendProof.js';
import { payment } from './chatbot-structure/system/payment.js';
import { ongkir } from './chatbot-structure/system/ongkir.js';
import { pendingProof, sessions, paymentStatus, groupSession, deliverySession, multipleFormSession, editingOrder, pendingOrders, userMode } from './chatbot-structure/settings/globalVariables.js';
import { verificationOrder, verificationPayment } from './chatbot-structure/system/verification.js';
import { handleDeliveryResponse } from './chatbot-structure/system/broadcasting/sendDelivery.js';
import { generateFormMultipleOrder } from './chatbot-structure/system/ordering/generateFormMultipleOrder.js';
import { deleteOrder } from './chatbot-structure/system/ordering/deleteOrder.js';
import { validationOrder } from './chatbot-structure/system/ordering/validationOrder.js';

// Membuat Settingan Whatsapp Web
// ==============================
const client = new Client({
    authStrategy: new LocalAuth()
});

// Menyimpan Session Users
// =======================
const welcomedUsers = new Set();

function isAvailabilityResponse(text) {
    const hasOrderId = /^\s*order id\s*:/im.test(text);
    const hasStatusProduk = /^\s*status produk(?:\s+\d+)?\s*:/im.test(text);

    return (
        hasOrderId &&
        (text.toLowerCase().includes('pesanan') || hasStatusProduk)
    );
}

function isPaymentResponse(text) {
    const hasOrderId = /^\s*order id\s*:/im.test(text);
    const hasPaymentStatus = /^\s*status\s*:/im.test(text);

    return (
        hasOrderId &&
        (text.toLowerCase().includes('pembayaran') || hasPaymentStatus)
    );
}

// Membuat QR Code
// ===============
client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
});

// Melacak Autentikasi
// ===================
client.on('authenticated',() => {
    console.log("AUTHENTICATED");
});

// Melacak Proses Sinkronisasi
// ===========================
client.on('loading_screen', (percent, message) => {
    console.log(percent, message);
});

// Follow-Up Bot Siap
// ==================
client.on('ready', () => {
    console.log('Bot Siap!');
});

// Membaca Pesan Masuk
// ===================
client.on('message', async message => {
    const allowedNumbers = [
        '76403240386784@lid', // Fikri
        '249344376729705@lid', // Kakak
        '129454609268764@lid', // Ayah
        '77855006433494@lid', // Diaz
        '58493310615674@lid', // Azmi
        '120363407187484870@g.us' // Group
    ];

    // Melacak Siapa Pengirim & Isi Pesannya
    // ======================================
    console.log(message.from);
    console.log(message.body);

    // Menyimpan Informasi Pengirim
    // ============================
    const userId = message.from;

    // Ekstraksi Pesan
    // ===============
    const text = message.body;

    // Memeriksa Apakah Nomor Pengirim Terdapat Di Dalam Daftar
    // ========================================================
    if(!allowedNumbers.includes(userId)) {
        return;
    }

    // Memeriksa Apakah Pesan Yang Dikirim Berupa Media (Sticker, Gambar, Dokumen, Video)
    // ==================================================================================
    if(message.hasMedia) {
        if(pendingProof[userId]) {
            const proof_photo = await message.downloadMedia();

            await sendProofToGroup(proof_photo, pendingProof[userId], pendingOrders[userId], client);

            delete pendingOrders[userId];
            
            return;
        } else {
            return;
        }
    }

    // Memeriksa & Menyimpan Data Pengirim, Jika Pertama Kalinya Berkunjung
    // ====================================================================
    if(!welcomedUsers.has(userId)) {
        welcomedUsers.add(userId);

        await message.reply(
            "Halo kak👋\n\nTerima kasih sudah menghubungi Klikbi Go🍽️🚚\n\nSaya admin KlikBiGo, ada yang bisa kami bantu? 😊\n[1] Pesan Produk\n[2] FAQ\n[3] Hubungi Admin"
        );

        return;
    }

    // Handling Untuk Export File (Excel)
    // ==================================
    if(text === "export") {
        await exportData();
    }

    // Handling Berpindah Menu
    // =======================
    if(text === "keluar") {
        delete sessions[userId];
        delete userMode[userId];
        delete sessions[userId];
        delete multipleFormSession[userId];

        await message.reply(
            "Halo kak👋\n\nTerima kasih sudah menghubungi Klikbi Go🍽️🚚\n\nSaya admin KlikBiGo, ada yang bisa kami bantu? 😊\n[1] Pesan Produk\n[2] FAQ\n[3] Hubungi Admin"
        );
        
        return;
    }

    // Peralihan chatbot -> admin manusia (Human Admin Session)
    // ========================================================
    if(userMode[userId] === "human-admin") {
        return;
    }

    // Follow-Up Dari Group Tenant (Group Session)
    // ===========================================
    if(groupSession[userId]) {
        if(deliverySession[userId]) {
            await handleDeliveryResponse(text, client);

            return;
        }

        // if(isAvailabilityResponse(text)) {
        //     const result = await verificationOrder(message.body, client);

        //     if(result?.message) {
        //         await message.reply(result.message);
        //     }

        //     if(result?.success) {
        //         delete groupSession[userId];
        //     }

        //     return;
        // }

        if(isPaymentResponse(text)) {
            const result = await verificationPayment(message.body, client);

            if(result?.message) {
                await message.reply(result.message);
            }

            return;
        }
    }

    // Menjalankan FAQ, Jika Pengirim Memilih Menu 2 (FAQ Session)
    // ===========================================================
    if(userMode[userId] === "faq") {
        const responseFaq = await faq(text);

        await message.reply(responseFaq);

        return;
    }

    // Pemilihan Metode Pemesanan, Single or Multiple (Form Session)
    // =============================================================
    if(userMode[userId] === "form") {
        if(text == "1") {
            await message.reply(
                "Baik kak, supaya kami bisa proses pesanannya, mohon info ya.\n\n📌Nama Pemesan: \n📌ID Produk: \n📌Jumlah Pesanan: \n📌Alamat Lengkap Pengantaran: \n📌Nomor Telepon Aktif: \n\nTerima Kasih🙏😊\n\n_*Jika ingin kembali, ketik keluar_"
            );

            sessions[userId] = true;
        } else if(text == "2") {
            await message.reply("Berapa produk yang ingin anda pesan?\n[1] 1\n[2] 2\n[3] 3\n [4] 4\n[5] 5");

            multipleFormSession[userId] = true;
        }

        delete userMode[userId];

        return;
    }

    // Metode Pemesanan Multiple Order (Multiple Order Session)
    // ========================================================
    if(multipleFormSession[userId]) {
        const responseForm = await generateFormMultipleOrder(text);

        await message.reply(responseForm);

        sessions[userId] = true;

        delete multipleFormSession[userId];

        return;
    }

    // Menjalankan Sistem Pendataan Formulir, Jika Pengirim Memilih Menu 2 (Ordering Session)
    // ======================================================================================
    if(sessions[userId]) {
        const responseOrder = await extractionOrder(text, userId, client);        

        await message.reply(responseOrder);

        return;
    }

    // Mengganti/Edit, Jika Suatu Produk Tidak Tersedia (Editing Order Session)
    // ========================================================================
    if(editingOrder[userId]["status"]) {
        if(text == "1") {
            await editingOrder(editingOrder[userId]["all_data_available"], editingOrder[userId]["order_id"], userId, client);
        } else if(text == "2") {
            await deleteOrder(editingOrder[userId]["all_data_available"], editingOrder[userId]["order_id"]);
            await validationOrder(editingOrder[userId]["data"], userId, false, client);
            delete editingOrder[userId];
        } else {
            await extractionOrder(text, userId, true, client);
            delete editingOrder[userId];
        }

        return;
    }

    // Handling Pemilihan Metode Payment (Payment Session)
    // ===================================================
    if(paymentStatus[userId]["status"]) {
        const responseOngkir = await ongkir(userId);
        const totalPrice = Number(responsePayment["total_price"]) || 0;
        const shippingCost = Number(responseOngkir) || 0;
        const totalPayment = totalPrice + shippingCost;
        let responsePayment = null;

        if(text == "1") {
            await message.reply(
                `Siap kak\n\nUntuk total pembayaran ${totalPayment}, sudah dengan ongkir sebesar ${shippingCost} ya kak, dilakukan secara cash saat pesanan diterima.\n\nPesanan akan segera kami proses 😊🙏🏻`
            );
        } else if(text == "2") {
            responsePayment = await payment(paymentStatus[userId]["order_id"]);
            
            if(!responsePayment) {
                await message.reply('Data pembayaran belum ditemukan. Mohon coba lagi setelah pesanan dikonfirmasi.');
                return;
            }

            const qris_photo = MessageMedia.fromFilePath(responsePayment["qris_photo"]);

            await message.reply(
                qris_photo,
                undefined,
                {
                    caption: `Total harga yang harus dibayar sejumlah Rp ${totalPayment}\nSudah ditambah dengan ongkir ${shippingCost} ya kak 😊🙏🏻\nMohon konfirmasi dan screenshot jika pembayaran sudah dilakukan 🙏🏻`
                }
            );
        }

        if(responsePayment?.["order_id"]) {
            pendingProof[userId] = responsePayment["order_id"];
        }

        delete paymentStatus[userId];

        return;
    }

    // Mengirimkan Informasi Pengirim Kepada Customer (Delivery Session)
    // =================================================================
    if(deliverySession[userId]) {
        await handleDeliveryResponse(text, client);

        return;
    }

    // Pengelolaan Pilihan Menu
    // ========================
    switch(text) {
        case "1":
            userMode[userId] = "form";

            await message.reply("Berapa banyak yang ingin Anda pesan?\n[1] Single Order\n[2] Multiple Order");
            
            return;
        case "2":
            userMode[userId] = "faq";

            await message.reply("[1] KlikBi Go Jual Apa Saja?\n[2] Bagaimana Cara Saya Memesan?\n[3] Kapan Jam Operasionalnya?\n[4] Apakah Ada Kurir Yang Mengantar?\n[5] Metode Pembayarannya Apa Saja?\n\n_Ketik keluar untuk kembali ke menu awal_");

            return;
        case "3":
            userMode[userId] = "human-admin";

            await message.reply("Baik, sekarang anda sudah terhubung dengan admin manusia, silakan tanyakan yang ingin anda tanyakan 🙏😊");

            return;
    }
});

// Inisialisasi Chatbot
client.initialize();