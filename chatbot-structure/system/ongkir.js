import fs from 'fs/promises';
import { campusZone } from "../settings/globalVariables.js";
import { calculateShipping } from "./shippingCalculator.js";

const DATA_USERS_PATH = './chatbot-structure/data/data_form_users.json';

async function loadDataUsers() {
    const rawDataUsers = await fs.readFile(DATA_USERS_PATH, 'utf8');

    return rawDataUsers.trim()
        ? JSON.parse(rawDataUsers)
        : [];
}

function getAddress(dataUser) {
    return (
        dataUser.address ||
        dataUser.alamat_lengkap_pengantaran ||
        dataUser["Alamat lengkap pengantaran"] ||
        dataUser["Alamat Lengkap Pengantaran"] ||
        ''
    );
}

export async function ongkir(userId) {
    const dataUsers = await loadDataUsers();
    let address = '';

    for(let index = dataUsers.length - 1; index >= 0; index--) {
        const dataUser = dataUsers[index];

        if(dataUser["user_id"] == userId) {
            address = getAddress(dataUser);
            break;
        }
    }

    if(!address) {
        return 0;
    }

    const location = getCampusShipping(address);

    if(location) {
        return location;
    }

    const result = await calculateShipping(address);

    return result.success
        ? result.shipping
        : 0;
}

function getCampusShipping(address) {
    const lowerAddress = address.toLowerCase();

    for(const price in campusZone) {

        const keywords = campusZone[price];
        
        for(const keyword of keywords) {

            if(lowerAddress.includes(keyword)) {
                return Number(price);
            }
        }
    }

    return null;
}
