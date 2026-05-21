import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import axios from "axios";
import fs from 'fs/promises';
import puppeteer from 'puppeteer';
import { exportExcel } from './exportExcel';

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

const form = JSON.parse(
    await fs.readFile('./chatbot-layer/data/intent_form.json', 'utf8')
);

const welcomedUsers = new Set();

const steps = Object.keys(form);

const sessions = {};

// Inisialisasi AI Mode
const aiMode = {};

// Membuat QR Code
client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
});

client.on('authenticated',() => {
    console.log("AUTHENTICATED");
});

client.on('loading_screen', (percent, message) => {
    console.log(percent, message);
});

client.on('ready', () => {
    console.log('Bot Siap!');
});

// Berjalan Setiap Ada Pesan Yang Masuk
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
            `Halo Customer, Selamat datang di Teachnode 👋.\n
            Kami adalah agensi pembuatan smart system berbasis web untuk memenuhi kebutuhan operasional bisnis Anda\n
            Jika ada yang bisa kami bantu, silahkan pilih pada salah satu menu berikut:\n
            [1] Mengobrol
            [2] Memesan Smart System
            [3] Lihat Portfolio
            [4] Arahkan Ke CS Manusia`
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

        delete aiMode[userId];

        await message.reply(
            `Halo Customer, Selamat datang di Teachnode 👋.\n
            Kami adalah agensi pembuatan smart system berbasis web untuk memenuhi kebutuhan operasional bisnis Anda\n
            Jika ada yang bisa kami bantu, silahkan pilih pada salah satu menu berikut:\n
            [1] Mengobrol
            [2] Memesan Smart System
            [3] Lihat Portfolio
            [4] Arahkan Ke CS Manusia`
        );
        
        return;
    }

    // Jalankan AI Mode, Jika Pengirim Memilih Menu 1
    if(aiMode[userId]) {
        try {
            console.log("Mau kirim ke FastApi")

            const response = await axios.post(
                'http://127.0.0.1:8000/predict',
                {
                    message: text
                }
            );
            const intent = response.data.intent;

            await message.reply(intent);
            return;

        } catch(error) {
            console.log(error);
            message.reply('Server Chatbot Error');
            return;
        }
    }

    // Jalankan Sistem Pendataan Formulir, Jika Pengirim Memilih Menu 2
    if(sessions[userId]) {
        const session = sessions[userId];

        const currentField = steps[session.currentStep];

        session.answer[currentField] = text;

        session.currentStep++;

        if(session.currentStep >= steps.length) {
            // Menyimpan Data Ke File JSON
            try {
                const fileData = await fs.readFile('./chatbot-layer/data/data_form_users.json', 'utf8');

                const users = JSON.parse(fileData);

                users.push({
                    user_id: userId,
                    created_at: new Date(),
                    ...session.answer
                });

                await fs.writeFile(
                    './chatbot-layer/data/data_form_users.json',
                    JSON.stringify(users, null, 4)
                );

                await message.reply('Form Telah Selesai, Terima Kasih!');

                delete sessions[userId];
            } catch(error) {
                console.log(error);

                await message.reply("Gagal Menyimpan Data!");
            }

            return;
        }

        await message.reply(form[steps[session.currentStep]]);

        return;
    }

    // Pengelolaan Pilihan Pengirim
    switch(text) {
        case "1":
            aiMode[userId] = true;
            await message.reply(
                `Silahkan Tanyakan Sesuatu
                Ketik "Menu" Untuk Kembali
                `
            );
            return;
        case "2":
            sessions[userId] = {
                currentStep: 0,
                answer: {}
            };

            await message.reply('Ketik "Menu" Untuk Kembali');

            await message.reply(form[steps[0]]);
            
            return;
        case "3":
            await message.reply("Portfolio Kami.....");
            return;
        case "4":
            await message.reply("Menghubungkan ke CS Manusia.....");
            return;
        default:
            await message.reply("Pilihan Tidak Tersedia!");
            return;
    } 
});

// Inisialisasi Chatbot
client.initialize();