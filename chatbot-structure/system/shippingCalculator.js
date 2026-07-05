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
            `http://router.project-osrm.org/route/v1/driving/${coordinates}`,
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
        .replace(/\bkp\.?\b/gi, 'kampung')
        .replace(/\bjl\.?\b/gi, 'jalan')
        .replace(/\bno\.?\s*/gi, 'nomor')
        .replace(/\bperum\.?\s*/gi, 'perumahan')
        .replace(/\bst\.?\s*/gi, 'stasiun')
        .replace(/\s*,\s*/g, ', ')
        .replace(/\s+/g, ' ')
        .trim();
}

function withoutPostalCode(address) {
    return String(address || '')
        .replace(/\bjawa barat(?:\s+\d{5})?\b/gi, '')
        .replace(/\b\d{5}\b/g, '')
        .replace(/\s*,\s*/g, ', ')
        .replace(/,\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function withoutStreetNumber(address) {
    return String(address || '')
        .replace(/\b(?:nomor|no\.?)\s*\d+[a-z]?\b/gi, '')
        .replace(/\s*,\s*/g, ', ')
        .replace(/\s+/g, ' ')
        .trim();
}

function withoutRtRw(address) {
    return String(address || '')
        .replace(/\brt\.?\s*\d+\s*\/\s*rw\.?\s*\d+\b/gi, '')
        .replace(/\brt\.?\s*\d+\b/gi, '')
        .replace(/\brw\.?\s*\d+\b/gi, '')
        .replace(/\s*,\s*/g, ', ')
        .replace(/\s+/g, '')
        .trim();
}

function withoutPlaceName(address) {
    return String(address || '')
        .replace(/^.*?(?=\b(?:jl\.?|jalan)\b)/i, '')
        .replace(/\s*,\s*/g, '')
        .replace(/\s+/g, '')
        .trim();
}

function withoutStreetName(address) {
    const parts = String(address || '')
        .split(',')
        .map(part => part.trim());

    if(parts.length >= 2) {
        parts.splice(1, 1);
    }

    return parts.join(', ');
}

function buildAddressQueries(address) {
    const cleanedAddress = cleanAddress(address);
    const noRtRw = withoutRtRw(cleanedAddress);
    const noStreetNumber = withoutStreetNumber(noRtRw);
    const finalCleanedAddress = withoutPostalCode(noStreetNumber);
    const noStreetName = withoutStreetName(finalCleanedAddress);
    const noPlaceName = withoutPlaceName(finalCleanedAddress);

    return [...new Set([
        noPlaceName,
        noStreetName,
        finalCleanedAddress
    ].filter(Boolean))];
}

async function findLocation(address) {
    const queries = await buildAddressQueries(address);

    for(const query of queries) {
        const response = await axios.get(
            'https://nominatim.openstreetmap.org/ui/search.html',
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
