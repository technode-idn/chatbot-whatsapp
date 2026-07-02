import axios from 'axios';
import { getDistance } from 'geolib';

const STORE_LOCATION = {
    latitude: -6.5899302,
    longitude: 106.8070187
}

const BASE_SHIPPING = 5000;
const SHIPPING_PER_KM = 2000;
const ROUTE_DISTANCE_TIMEOUT_MS = 12000;
const NOMINATIM_USER_AGENT = 'KlikBiGo WhatsApp Bot/1.0';

function calculateShippingCost(distanceInKm) {
    const chargedKm = distanceInKm > 0 ? Math.ceil(distanceInKm) : 0;

    return BASE_SHIPPING + (chargedKm * SHIPPING_PER_KM);
}

async function calculateRouteDistanceInKm(origin, destination) {
    try {
        const coordinates = [`${origin.longitude},${origin.latitude}`, `${destination.longitude},${destination.latitude}`].join(';');

        const response = await axios.get(
            `https://router.project-osrm.org/route/v1/driving/${coordinates}`,
            {
                params: {
                    overview: 'false'
                },
                timeout: ROUTE_DISTANCE_TIMEOUT_MS
            }
        );

        const distanceInMeters = response.data?.routes?.[0]?.distance;

        return Number.isFinite(distanceInMeters) ? distanceInMeters / 1000 : null;
    } catch(error) {
        return null;
    }
}

function cleanAddress(address) {
    return String(address || '')
        .replace(/\bRT\.?\s*\d+\s*\/\s*RW\.?\s*\d+\b/gi, ' ')
        .replace(/\bRT\.?\s*\d+\b/gi, ' ')
        .replace(/\bRW\.?\s*\d+\b/gi, ' ')
        .replace(/\bKp\.?\b/gi, 'Kampung')
        .replace(/\bKec\.?\b/gi, 'Kecamatan')
        .replace(/\bKab\.?\b/gi, 'Kabupaten')
        .replace(/\bNo\.?\s*/gi, 'Nomor ')
        .replace(/\s*,\s*/g, ', ')
        .replace(/\s+/g, ' ')
        .trim();
}

function withoutPostalCode(address) {
    return String(address || '')
        .replace(/\b\d{5}\b/g, '')
        .replace(/\s*,\s*/g, ', ')
        .replace(/\s+/g, ' ')
        .trim();
}

function withoutStreetNumber(address) {
    return String(address || '')
        .replace(/\b(?:Nomor|No\.?)\s*\d+[a-z]?\b/gi, '')
        .replace(/\s*,\s*/g, ', ')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildAddressQueries(address) {
    const cleanedAddress = cleanAddress(address);
    const noPostalCode = withoutPostalCode(cleanedAddress);
    const noStreetNumber = withoutStreetNumber(noPostalCode);
    const withIndonesia = value => /indonesia/i.test(value) ? value : `${value}, Indonesia`;

    return [...new Set([
        cleanedAddress,
        noPostalCode,
        noStreetNumber,
        withIndonesia(cleanedAddress),
        withIndonesia(noPostalCode),
        withIndonesia(noStreetNumber)
    ].filter(Boolean))];
}

async function findLocation(address) {
    const queries = buildAddressQueries(address);

    for(const query of queries) {
        const response = await axios.get(
            'https://nominatim.openstreetmap.org/search',
            {
                headers: {
                    'User-Agent': NOMINATIM_USER_AGENT,
                    'Accept-Language': 'id,en'
                },
                params: {
                    q: query,
                    format: 'jsonv2',
                    limit: 1,
                    countrycodes: 'id',
                    addressdetails: 1
                },
                timeout: 10000
            }
        );

        if(response.data.length > 0) {
            return {
                location: response.data[0],
                query
            };
        }
    }

    return null;
}

export async function calculateShipping(address) {
    try {
        const locationResult = await findLocation(address);

        if(!locationResult?.location) {
            return {
                success: false,
                message: 'Alamat tidak ditemukan'
            };
        }

        const location = locationResult.location;

        const customerLocation = {
            latitude: parseFloat(location.latitude ?? location.lat),
            longitude: parseFloat(location.longitude ?? location.lon)
        };

        const routeDistanceInKm = await calculateRouteDistanceInKm(STORE_LOCATION, customerLocation);
        const directDistanceInKm = getDistance(STORE_LOCATION, customerLocation) / 1000;
        const distanceInKm = routeDistanceInKm ?? directDistanceInKm;

        const shipping = calculateShippingCost(distanceInKm);

        return {
            success: true,
            distance: distanceInKm.toFixed(2),
            distance_type: routeDistanceInKm ? 'route' : 'direct',
            query: locationResult.query,
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
