import axios from 'axios';
import { getDistance } from 'geolib';

const STORE_LOCATION = {
    latitude: -6.5899302,
    longitude: 106.8070187
};

const BASE_SHIPPING = 5000;
const SHIPPING_PER_KM = 2000;

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

const REQUEST_TIMEOUT = 10000;

const NOMINATIM_USER_AGENT = 'KlikBiGo WhatsApp Bot/1.0';

function calculateShippingCost(distanceKm) {
    const chargedKm = Math.max(0, Math.ceil(distanceKm));

    return BASE_SHIPPING + (chargedKm * SHIPPING_PER_KM);
}

function cleanAddress(address) {
    return String(address || '')
        .replace(/\bkp\.?\b/gi, 'kampung')
        .replace(/\bjl\.?\b/gi, 'jalan')
        .replace(/\bno\.?\s*/gi, 'nomor ')
        .replace(/\bperum\.?\b/gi, 'perumahan')
        .replace(/\bst\.?\b/gi, 'stasiun')
        .replace(/\s*,\s*/g, ', ')
        .replace(/\s+/g, ' ')
        .trim();
}

function withoutPostalCode(address) {
    return String(address)
        .replace(/\b\d{5}\b/g, '')
        .replace(/\bjawa barat\b/gi, '')
        .replace(/\s*,\s*/g, ', ')
        .replace(/,\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function withoutStreetNumber(address) {
    return String(address)
        .replace(/\b(?:nomor|no\.?)\s*\d+[a-z]?\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function withoutRtRw(address) {
    return String(address)
        .replace(/\brt\.?\s*\d+\s*\/\s*rw\.?\s*\d+\b/gi, '')
        .replace(/\brt\.?\s*\d+\b/gi, '')
        .replace(/\brw\.?\s*\d+\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function withoutPlaceName(address) {
    return String(address)
        .replace(/^.*?(?=\b(?:jalan|jl\.?)\b)/i, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function withoutStreetName(address) {
    const parts = address.split(',').map(x => x.trim());

    if (parts.length >= 2) {
        parts.splice(1, 1);
    }

    return parts.join(', ');
}

function buildAddressQueries(address) {
    const cleaned = cleanAddress(address);

    const noRtRw = withoutRtRw(cleaned);

    const noStreetNumber = withoutStreetNumber(noRtRw);

    const finalAddress = withoutPostalCode(noStreetNumber);

    return [
        withoutPlaceName(finalAddress),
        withoutStreetName(finalAddress),
        finalAddress
    ]
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i);
}

async function findLocation(address) {

    const queries = buildAddressQueries(address);

    for (const query of queries) {

        console.log("Trying query:", query);

        try {

            const response = await axios.get(NOMINATIM_URL, {

                headers: {
                    'User-Agent': NOMINATIM_USER_AGENT,
                    'Accept-Language': 'id,en'
                },

                params: {
                    q: query,
                    format: 'jsonv2',
                    limit: 1,
                    addressdetails: 1,
                    countrycodes: 'id'
                },

                timeout: REQUEST_TIMEOUT

            });

            if (response.data.length > 0) {

                const place = response.data[0];

                console.log("Location Found");

                console.log(place.display_name);

                console.log(place.lat, place.lon);

                return {
                    query,
                    location: place
                };

            }

        } catch (err) {

            console.error("Nominatim Error");

            console.error(err.message);

        }

    }

    return null;

}

async function calculateRouteDistance(origin, destination) {

    const coordinates = [
        `${origin.longitude},${origin.latitude}`,
        `${destination.longitude},${destination.latitude}`
    ].join(';');

    const url = `${OSRM_URL}/${coordinates}`;

    console.log("OSRM URL");

    console.log(url);

    try {

        const response = await axios.get(url, {

            params: {
                overview: 'false'
            },

            timeout: REQUEST_TIMEOUT

        });

        console.log("OSRM Response");

        console.log(response.data);

        if (response.data.code !== 'Ok') {

            console.error("OSRM returned:", response.data.code);

            return null;

        }

        if (!response.data.routes.length) {

            console.error("No Route");

            return null;

        }

        return response.data.routes[0].distance / 1000;

    } catch (err) {

        console.error("OSRM Error");

        console.error(err.response?.status);

        console.error(err.response?.data);

        console.error(err.message);

        return null;

    }

}

export async function calculateShipping(address) {

    try {

        const locationResult = await findLocation(address);

        if (!locationResult) {

            return {

                success: false,

                message: 'Alamat tidak ditemukan'

            };

        }

        const customerLocation = {

            latitude: Number(locationResult.location.lat),

            longitude: Number(locationResult.location.lon)

        };

        console.log("Customer Coordinate");

        console.log(customerLocation);

        let distanceKm = await calculateRouteDistance(

            STORE_LOCATION,

            customerLocation

        );

        let distanceType = 'route';

        if (distanceKm === null) {

            console.warn("Fallback to straight distance");

            distanceKm = getDistance(

                STORE_LOCATION,

                customerLocation

            ) / 1000;

            distanceType = 'direct';

        }

        const shipping = calculateShippingCost(distanceKm);

        return {

            success: true,

            shipping,

            distance: distanceKm.toFixed(2),

            distance_type: distanceType,

            query: locationResult.query,

            customer_location: customerLocation

        };

    } catch (err) {

        console.error(err);

        return {

            success: false,

            message: 'Gagal menghitung ongkir'

        };

    }

}