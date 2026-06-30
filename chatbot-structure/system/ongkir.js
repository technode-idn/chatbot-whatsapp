import fs from 'fs/promises';
import { campusZone } from "../settings/globalVariables.js";
import { calculateShipping, hasMapLocation } from "./shippingCalculator.js";
import { rawDataUsers } from '../settings/loadFiles.js';

const users = rawDataUsers.trim() ? JSON.parse(rawDataUsers) : [];

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

export async function ongkir(userId) {
    let address = '';

    for(let index = users.length - 1; index >= 0; index--) {
        const dataUser = users[index];

        if(dataUser["user_id"] == userId) {
            address = dataUser["address"];
            break;
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