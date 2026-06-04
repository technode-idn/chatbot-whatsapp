import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from "qrcode-terminal";
import puppeteer from 'puppeteer';
import { exportExcel } from './chatbot-structure/system/exportExcel.js';
import { aiMode } from './chatbot-structure/system/aiMode.js';
import { ordering } from './chatbot-structure/system/ordering.js';
import { sendProofToGroup, handleGroupResponse2 } from './chatbot-structure/system/broadcasting.js';
import { payment } from './chatbot-structure/system/payment.js';
import { ongkir } from './chatbot-structure/system/ongkir.js';
import { pendingProof, aiStatus, sessions, paymentStatus, groupSession, deliverySession } from './chatbot-structure/settings/globalVariables.js';
import {
    verificationOrder,
    verificationPayment
} from './chatbot-structure/system/verification.js';

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
    const hasStatusProduk = /^\s*status produk\s*:/im.test(text);

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
    const isGroupMessage = userId.endsWith('@g.us');

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
            await sendProofToGroup(text, client);
            delete pendingProof[userId];
            return;
        } else {
            return;
        }
    }

    // Follow-Up Dari Group Tenant / Admin
    // ===================================
    if(isGroupMessage) {
        if(groupSession[userId]) {
            console.log("GROUP SESSION ACTIVE");
            console.log(text);

            if(isAvailabilityResponse(text)) {
                const result = await verificationOrder(
                    message.body,
                    userId,
                    client
                );

                if(result?.message) {
                    await message.reply(result.message);
                }

                if(result?.success) {
                    delete groupSession[userId];
                }

                return;
            }

            if(isPaymentResponse(text)) {
                await verificationPayment(
                    message.body,
                    client
                );

                delete groupSession[userId];

                return;
            }

            return;
        }

        if(deliverySession[userId]) {
            await handleGroupResponse2(text, client);

            delete deliverySession[userId];

            return;
        }

        return;
    }

    // Memeriksa & Menyimpan Data Pengirim, Jika Pertama Kalinya Berkunjung
    // ====================================================================
    if(!welcomedUsers.has(userId)) {
        welcomedUsers.add(userId);

        await message.reply(
            "Halo kak👋\nTerima kasih sudah menghubungi Klikbi Go🍽️🚚\nSaya admin KlikBiGo, ada yang bisa kami bantu? 😊\n[1] Pesan Produk\n[2] Tanya Produk\n[3] FAQ\n[4] Hubungi Admin"
        );

        return;
    }

    // Handling Untuk Export File (Excel)
    // ==================================
    if(text === "export") {
        await exportExcel();
    }

    // Handling Berpindah Menu
    // =======================
    if(text === "menu" || text === "keluar") {
        delete sessions[userId];

        delete aiStatus[userId];

        await message.reply(
            "Halo kak👋\nTerima kasih sudah menghubungi Klikbi Go🍽️🚚\nSaya admin KlikBiGo, ada yang bisa kami bantu? 😊\n[1] Pesan Produk\n[2] Tanya Produk\n[3] FAQ\n[4] Hubungi Admin"
        );
        
        return;
    }

    // Menjalankan AI Mode, Jika Pengirim Memilih Menu 1 (AI Session)
    // ==============================================================
    if(aiStatus[userId]) {
        const responseAi =  await aiMode(text);

        await message.reply(responseAi);


        return;
    }

    // Menjalankan Sistem Pendataan Formulir, Jika Pengirim Memilih Menu 2 (Ordering Session)
    // ======================================================================================
    if(sessions[userId]) {
        const responseOrder = await ordering(client, text, userId);        

        await message.reply(responseOrder);

        return;
    }

    // Handling Pemilihan Metode Payment (Payment Session)
    // ===================================================
    if(paymentStatus[userId]) {
        const responseOngkir = await ongkir(userId);

        if(text == "1") {
            await message.reply(
                "Siap kak\nPembayaran dilakukan secara cash saat pesanan diterima ya.\nPesanan akan segera kami proses"
            );
            await message.reply(responseOngkir);
        } else if(text == "2") {
            const responsePayment = await payment(userId);
            
            if(!responsePayment) {
                await message.reply('Data pembayaran belum ditemukan. Mohon coba lagi setelah pesanan dikonfirmasi.');
                return;
            }

            const totalPrice = Number(responsePayment["total_price"]) || 0;
            const shippingCost = Number(responseOngkir) || 0;
            const totalPayment = totalPrice + shippingCost;
            const qris_photo = MessageMedia.fromFilePath(responsePayment["qris_photo"]);

            await message.reply(
                qris_photo,
                undefined,
                {
                    caption: `Total harga yang harus dibayar sejumlah Rp ${totalPayment}\nSudah ditambah dengan ongkir ${shippingCost} ya kak 😊🙏🏻`
                }
            );
        }

        delete paymentStatus[userId];

        pendingProof[userId] = true;

        return;
    }

    // Pengelolaan Pilihan Menu
    // ========================
    switch(text) {
        case "1":
            sessions[userId] = true;

            await message.reply(
                "Baik kak, supaya kami bisa proses pesanannya, mohon info ya :\n\n📌Nama Pemesan : \n📌Produk Pesanan : \n📌Jumlah Pesanan : \n📌Alamat Lengkap Pengantaran : \n📌Nomor Telpon Aktif : \n\nTerima Kasih🙏😊"
            );
            
            return;
        case "2":
            aiStatus[userId] = true;

            await message.reply(
                `Silahkan Tanyakan Sesuatu
                Ketik "Menu" Untuk Kembali
                `
            );

            return;
        case "3":
            return;
        case "4":
            return;
    }
});

// Inisialisasi Chatbot
client.initialize();
