import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import fs from 'fs/promises';
import puppeteer from 'puppeteer';
import { exportExcel } from './chatbot-structure/system/exportExcel.js';
import { aiStatus, aiMode } from './chatbot-structure/system/aiMode.js';
import { sessions, ordering, form } from './chatbot-structure/system/ordering.js';
import { handleOwnerResponse } from './chatbot-structure/settings/tenantBroadcasting.js';

// Membuat Settingan Whatsapp Web
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

const welcomedUsers = new Set();

// Membuat QR Code
client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
});

// Melacak Autentikasi
client.on('authenticated',() => {
    console.log("AUTHENTICATED");
});

// Melacak Proses Sinkronisasi
client.on('loading_screen', (percent, message) => {
    console.log(percent, message);
});

// Follow-Up Bot Siap
client.on('ready', () => {
    console.log('Bot Siap!');
});

// Membaca Pesan Masuk
client.on('message', async message => {
    const allowedNumbers = [
        '76403240386784@lid',
        '249344376729705@lid',
        '77855006433494@lid'
    ];

    console.log(message.from);
    console.log(message.body);

    // Menyimpan Informasi Pengirim
    const userId = message.from;

    const text = message.body.toLocaleLowerCase().trim();

    // Memeriksa Apakah Nomor Pengirim Terdapat Di Dalam Daftar
    if(!allowedNumbers.includes(userId)) {
        return;
    } 

    // Memeriksa Apakah Pesan Yang Dikirim Berupa Media (Sticker, Gambar, Dokumen, Video)
    if(message.hasMedia) {
        return;
    }

    // Memeriksa & Menyimpan Data Pengirim, Jika Pertama Kalinya Berkunjung
    if(!welcomedUsers.has(userId)) {
        welcomedUsers.add(userId);

        // Kirim Pesan Berikut Untuk Pengirim Yang Baru Terdaftar
        await message.reply(
            "Halo kak👋\nTerima kasih sudah menghubungi Klikbi Go🍽️🚚\nSaya admin KlikBiGo, ada yang bisa kami bantu? 😊\n[1] Pesan Produk\n[2] Tanya Produk\n[3] FAQ\n[4] Hubungi Admin"
        );

        return;
    }

    if(text === "export") {
        const success = await exportExcel();

        if(success) {
            await message.reply('Excel Berhasil Dibuat!');
        } else {
            await message.reply('Export Gagagl');
        }
    }

    // Handling Berpindah Menu
    if(text === "menu" || text === "keluar") {
        delete sessions[userId];

        delete aiStatus[userId];

        await message.reply(
            "Halo kak👋\nTerima kasih sudah menghubungi Klikbi Go🍽️🚚\nSaya admin KlikBiGo, ada yang bisa kami bantu? 😊\n[1] Pesan Produk\n[2] Tanya Produk\n[3] FAQ\n[4] Hubungi Admin"
        );
        
        return;
    }

    // Jalankan AI Mode, Jika Pengirim Memilih Menu 1
    if(aiStatus[userId]) {
        const responseAi =  await aiMode(text);

        await message.reply(responseAi);


        return;
    }

    // Jalankan Sistem Pendataan Formulir, Jika Pengirim Memilih Menu 2
    if(sessions[userId]) {
        const responseOrder = await ordering(text, userId, client);        

        await message.reply(responseOrder);

        return;
    }

    if(text.startsWith("tersedia") || text.startsWith("tidak")) {
        const response = await handleOwnerResponse(client, text);

        await message.reply(response);

        return;
    }

    // Pengelolaan Pilihan Pengirim
    switch(text) {
        case "1":
            sessions[userId] = true;

            await message.reply(form.form_template);
            
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