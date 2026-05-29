import { campusZone } from "../settings/globalVariables.js";
import { calculateShipping } from "./shippingCalculator.js";
import { rawDataUsers } from "../settings/loadFiles.js";

export async function ongkir(userId) {
    const dataUsers = JSON.parse(rawDataUsers);

    for(const dataUser of dataUsers) {
        if(dataUser["user_id"] == userId) {
            address = dataUser["Alamat lengkap pengantaran"]
        }
    }

    const location = getCampusShipping(address);

    if(location) {
        shipping = location;
        return shipping;
    } else {
        const distance = await calculateShipping(address);
        return distance;
    }
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