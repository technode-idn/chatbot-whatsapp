import { campusZone } from "../settings/shippingRules.js";
import { calculateShipping } from "../settings/shippingCalculator.js";

export async function ongkir(userId) {
    const rawData = await fs.readFile('./chatbot-structure/data/data_form_users.json', 'utf8');
    const dataUsers = JSON.parse(rawData);

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