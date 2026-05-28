import axios from 'axios';
import { getDistance } from 'geolib';

const STORE_LOCATION = {
    latitude: -6.558189,
    longitude: 106.725411
}

export async function calculateShipping(address) {
    try {
        const response = await axios.get(
            'https://nominatim.openstreetmap.org/search',
            {
                params: {
                    q: address,
                    format: 'json',
                    limit: 1
                }
            }
        );

        if(response.data.length === 0) {
            return {
                success: false,
                message: 'Alamat tidak ditemukan'
            };
        }

        const location = response.data[0];

        const customerLocation = {
            latitude: parseFloat(location.lat),
            longitude: parseFloat(location.lon)
        };

        const distanceInMeters = getDistance(STORE_LOCATION, customerLocation);

        const distanceInKm = distanceInMeters / 1000;

        let shipping = 5000;

        if(distanceInKm > 1) {
            shipping += Math.ceil(distanceInKm - 1) * 2000;
        }

        return {
            success: true,
            distance: distanceInKm.toFixed(2),
            shipping
        };
    } catch(error) {
        console.log(error);
        return {
            success: false,
            message: 'Gagal menghitung ongkir'
        };
    }
}