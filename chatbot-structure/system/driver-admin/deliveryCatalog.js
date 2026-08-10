import fs from 'fs/promises';
import { DATA_DELIVERY_PATH } from '../../settings/loadFiles.js';

async function loadDeliveries() {
    const rawData = await fs.readFile(DATA_DELIVERY_PATH, 'utf8');
    const deliveries = rawData.trim() ? JSON.parse(rawData) : [];

    if(!Array.isArray(deliveries)) {
        throw new Error('Format database_delivery.json harus berupa array.');
    }

    return deliveries;
}

async function saveDeliveries(deliveries) {
    await fs.writeFile(DATA_DELIVERY_PATH, `${JSON.stringify(deliveries, null, 2)}\n`, 'utf8');
}

function normalizeKey(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/^[^a-z0-9]+/i, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function parseForm(text) {
    const data = {};

    for(const line of String(text || '').split('\n')) {
        if(!line.includes(':')) continue;

        const [key, ...valueParts] = line.split(':');
        const normalizedKey = normalizeKey(key);

        if(normalizedKey) data[normalizedKey] = valueParts.join(':').trim();
    }

    return data;
}

function getDeliveryId(data) {
    return String(data.nim || data.id_delivery || '').trim().toUpperCase();
}

function getPhone(value) {
    return String(value || '').replace(/[\s()-]/g, '');
}

export async function addDelivery(text) {
    const data = parseForm(text);
    const idDelivery = getDeliveryId(data);
    const phone = getPhone(data.nomor_telepon || data.phone || data.no_telepon);
    const name = String(data.nama || data.name || '').trim();

    if(!idDelivery || !phone || !name) {
        return { success: false, message: 'Mohon isi form dengan NIM, Nomor Telepon, dan Nama.' };
    }

    if(!/^[A-Z0-9_-]+$/.test(idDelivery)) {
        return { success: false, message: 'NIM hanya boleh berisi huruf, angka, tanda hubung, atau garis bawah.' };
    }

    if(!/^\+?\d{8,15}$/.test(phone)) {
        return { success: false, message: 'Nomor telepon harus berisi 8–15 digit angka.' };
    }

    const deliveries = await loadDeliveries();
    const existingDelivery = deliveries.find(delivery => (
        String(delivery.id_delivery || '').trim().toUpperCase() === idDelivery
    ));

    if(existingDelivery) {
        return { success: false, message: `Kurir dengan NIM *${idDelivery}* sudah terdaftar.` };
    }

    deliveries.push({ id_delivery: idDelivery, phone, name });
    await saveDeliveries(deliveries);

    return { success: true, message: `Data kurir *${name}* (NIM: ${idDelivery}) berhasil ditambahkan.` };
}

export async function deleteDelivery(text) {
    const formData = parseForm(text);
    const idDelivery = getDeliveryId(formData) || String(text || '').trim().toUpperCase();

    if(!idDelivery) {
        return { success: false, message: 'Mohon masukkan NIM kurir yang akan dihapus.' };
    }

    const deliveries = await loadDeliveries();
    const deliveryIndex = deliveries.findIndex(delivery => (
        String(delivery.id_delivery || '').trim().toUpperCase() === idDelivery
    ));

    if(deliveryIndex === -1) {
        return { success: false, message: `Kurir dengan NIM *${idDelivery}* tidak ditemukan.` };
    }

    const [deletedDelivery] = deliveries.splice(deliveryIndex, 1);
    await saveDeliveries(deliveries);

    return { success: true, message: `Data kurir *${deletedDelivery.name}* (NIM: ${idDelivery}) berhasil dihapus.` };
}

export async function displayDeliveries() {
    const deliveries = await loadDeliveries();

    if(!deliveries.length) {
        return 'Belum ada data kurir yang tersedia.';
    }

    const deliveryList = deliveries.map((delivery, index) => (
        `${index + 1}. *${delivery.name || '-'}*\nNIM: ${delivery.id_delivery || '-'}\nNomor Telepon: ${delivery.phone || '-'}`
    ));

    return `*DATA KURIR TERSEDIA*\n=============================\n\n${deliveryList.join('\n\n')}`;
}
