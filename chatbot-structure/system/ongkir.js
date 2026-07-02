import fs from 'fs/promises';
import { campusZone, pendingOrders } from "../settings/globalVariables.js";
import { calculateShipping } from "./shippingCalculator.js";
import { DATA_USERS_PATH } from '../settings/loadFiles.js';

async function loadDataUsers() {
    const dataUsers = await fs.readFile(DATA_USERS_PATH, 'utf8');

    return dataUsers.trim() ? JSON.parse(dataUsers) : [];
}

function getAddressFromPendingOrder(userId, orderId = null) {
    if(orderId && pendingOrders[orderId]?.customer === userId) {
        return pendingOrders[orderId].customerInfo?.address
            || pendingOrders[orderId].data?.["alamat_lengkap_pengantaran"]
            || '';
    }

    const userPendingOrders = Object.values(pendingOrders)
        .filter(order => order?.customer === userId && order?.status === "PENDING_PAYMENT")
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const latestOrder = userPendingOrders[0];

    return latestOrder?.customerInfo?.address
        || latestOrder?.data?.["alamat_lengkap_pengantaran"]
        || '';
}

function getCampusShipping(address) {
    const lowerAddress = address.toLowerCase();
    const tokens = lowerAddress
        .split(/[^a-z0-9]+/)
        .filter(Boolean);

    for(const price in campusZone) {

        const keywords = campusZone[price];
        
        for(const keyword of keywords) {
            const normalizedKeyword = String(keyword || '').toLowerCase().trim();

            if(!normalizedKeyword) {
                continue;
            }

            if(normalizedKeyword.includes(' ') && lowerAddress.includes(normalizedKeyword)) {
                return Number(price);
            }

            if(tokens.includes(normalizedKeyword)) {
                return Number(price);
            }
        }
    }

    return null;
}

export async function ongkir(userId, orderId = null) {
    let address = getAddressFromPendingOrder(userId, orderId);
    const users = await loadDataUsers();

    if(!address) {
        for(let index = users.length - 1; index >= 0; index--) {
            const dataUser = users[index];

            if(dataUser["user_id"] == userId) {
                address = dataUser["address"];
                break;
            }
        }
    }

    if(!address) {
        return 0;
    }

    const location = getCampusShipping(address)

    if(location) {
        return location;
    }

    const result = await calculateShipping(address);

    return result.success ? result.shipping : 0;
}
