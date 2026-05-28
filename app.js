import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import fs from 'fs/promises';
import puppeteer from 'puppeteer';
import { exportExcel } from './chatbot-structure/system/exportExcel.js';
import { aiStatus, aiMode } from './chatbot-structure/system/aiMode.js';
import { sessions, ordering } from './chatbot-structure/system/ordering.js';
import { handleOwnerResponse } from './chatbot-structure/settings/tenantBroadcasting.js';
import { paymentStatus, payment } from './chatbot-structure/system/payment.js';
import { ongkir } from './chatbot-structure/system/ongkir.js';

// Membuat Settingan Whatsapp Web
// ==============================
const client = new Client({
    authStrategy: new LocalAuth(),

    puppeteer: {
        executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disabled-gpu'
        ]
    }
});

// Menyimpan Session Users
// =======================
const welcomedUsers = new Set();

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
        '76403240386784@lid',
        '249344376729705@lid',
        '77855006433494@lid'
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
    const text = message.body.toLocaleLowerCase().trim();

    // Memeriksa Apakah Nomor Pengirim Terdapat Di Dalam Daftar
    // ========================================================
    if(!allowedNumbers.includes(userId)) {
        return;
    } 

    // Memeriksa Apakah Pesan Yang Dikirim Berupa Media (Sticker, Gambar, Dokumen, Video)
    // ==================================================================================
    if(message.hasMedia) {
        if(text == "11") {
            await message.reply("Terima kasih, pesanan akan segera kami proses!")
            paymentStatus = false;
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
            "Halo kak👋\nTerima kasih sudah menghubungi Klikbi Go🍽️🚚\nSaya admin KlikBiGo, ada yang bisa kami bantu? 😊\n[1] Pesan Produk\n[2] Tanya Produk\n[3] FAQ\n[4] Hubungi Admin"
        );

        return;
    }

    // Handling Untuk Export File (Excel)
    // ==================================
    if(text === "export") {
        const success = await exportExcel();

        if(success) {
            await message.reply('Excel Berhasil Dibuat!');
        } else {
            await message.reply('Export Gagagl');
        }
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

    // Menjalankan AI Mode, Jika Pengirim Memilih Menu 1
    // =================================================
    if(aiStatus[userId]) {
        const responseAi =  await aiMode(text);

        await message.reply(responseAi);


        return;
    }

    // Menjalankan Sistem Pendataan Formulir, Jika Pengirim Memilih Menu 2
    // ================================================================
    if(sessions[userId]) {
        const responseOrder = await ordering(text, userId, client);        

        await message.reply(responseOrder);

        return;
    }

    // Follow-Up Customer Mengenai Ketersediaan Produk
    // ===============================================
    if(text == "tersedia" || text == "tidak tersedia") {
        const response = await handleOwnerResponse(client, text, userId);

        await message.reply(response);

        return;
    }

    // Handling Pemilihan Metode Payment
    // =================================
    if(paymentStatus) {
        if(text == "1") {
            await message.reply(
                "Siap kak\nPembayaran dilakukan secara cash saat pesanan diterima ya.\nPesanan akan segera kami proses"
            );
        } else if(text == "2") {
            const responsePayment = await payment(userId);
            const responseOngkir = await ongkir(userId);
            await message.reply(responsePayment);
            await message.reply(responseOngkir)
        }
    }

    // Pengelolaan Pilihan Menu
    // ========================
    switch(text) {
        case "1":
            sessions[userId] = true;

            await message.reply(
                "Baik kak, supaya kami bisa proses pesanannya, mohon info ya :\n📌Nama pemesan : \n📌Menu & jumlah pesanan : \n📌Alamat lengkap pengantaran : \n📌Nomor Telpon aktif : \n\nTerima kasih🙏😊"
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