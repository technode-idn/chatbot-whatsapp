import axios from 'axios';
import { pendingOrders } from '../settings/globalVariables.js';

const STORE_LOCATION = {
    latitude: -6.5899302,
    longitude: 106.8070187
};
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
const RAIN_CHARGE = 5000;
const STORM_CHARGE = 10000;

export function getWeatherChargeByCode(weatherCode) {
    const code = Number(weatherCode);

    if([65, 67, 82, 95, 96, 99].includes(code)) {
        return { condition: 'hujan badai', charge: STORM_CHARGE };
    }

    if([51, 53, 55, 56, 57, 61, 63, 66, 80, 81].includes(code)) {
        return { condition: 'hujan', charge: RAIN_CHARGE };
    }

    return { condition: 'tidak hujan', charge: 0 };
}

export async function getOrderWeatherCharge(orderId) {
    const pendingOrder = pendingOrders[orderId];

    if(pendingOrder?.weather_charge) {
        return pendingOrder.weather_charge;
    }

    try {
        const response = await axios.get(WEATHER_API_URL, {
            params: {
                latitude: STORE_LOCATION.latitude,
                longitude: STORE_LOCATION.longitude,
                current: 'weather_code,precipitation',
                timezone: 'Asia/Jakarta'
            },
            timeout: 10000
        });
        const weatherCode = response.data?.current?.weather_code;
        const weatherCharge = {
            ...getWeatherChargeByCode(weatherCode),
            weather_code: weatherCode,
            checked_at: new Date().toISOString()
        };

        if(pendingOrder) {
            pendingOrder.weather_charge = weatherCharge;
        }

        return weatherCharge;
    } catch(error) {
        const weatherCharge = {
            condition: 'tidak tersedia',
            charge: 0,
            checked_at: new Date().toISOString()
        };

        if(pendingOrder) {
            pendingOrder.weather_charge = weatherCharge;
        }

        return weatherCharge;
    }
}
