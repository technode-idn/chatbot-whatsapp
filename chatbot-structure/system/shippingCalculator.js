import axios from 'axios';
import { getDistance } from 'geolib';
import { localAddressAliases } from '../settings/globalVariables.js';

const STORE_LOCATION = {
    latitude: -6.5899302,
    longitude: 106.8070187
}

const BASE_SHIPPING = 5000;
const SHIPPING_PER_KM = 2000;
const ROUTE_DISTANCE_TIMEOUT_MS = 12000;
const DEFAULT_LOCATION_CONTEXT = 'Bogor, Jawa Barat, Indonesia';
const NOMINATIM_USER_AGENT = 'KlikBiGo WhatsApp Bot/1.0';
const GOOGLE_MAPS_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const MAPS_URL_PATTERN = /https?:\/\/[^\s]+/gi;
const COORDINATE_PATTERN = /(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/;
const PLUS_CODE_PATTERN = /\b([23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,})\b/i;
const PLUS_CODE_ALPHABET = '23456789CFGHJMPQRVWX';
const PLUS_CODE_SEPARATOR_POSITION = 8;
const PLUS_CODE_PAIR_RESOLUTIONS = [20, 1, 0.05, 0.0025, 0.000125];

function normalizeAddress(address) {
    return String(address || '').trim().replace(/\s+/g, ' ');
}

function normalizeAddressKey(address) {
    return normalizeAddress(address).toLowerCase();
}

function findLocalAddressAlias(address) {
    const normalizedAddress = normalizeAddressKey(address);

    for(const [keyword, location] of Object.entries(localAddressAliases || {})) {
        if(normalizedAddress.includes(normalizeAddressKey(keyword))) {
            return location;
        }
    }

    return null;
}

function cleanGoogleMapsPlaceQuery(query) {
    return normalizeAddress(query)
        .replace(/\+/g, ' ')
        .replace(/\bSt\.\s*/gi, 'Stasiun ')
        .replace(/\bPd\.\s*/gi, 'Pondok ')
        .replace(/\bKec\.\s*/gi, '')
        .replace(/\s+,/g, ',')
        .replace(/,\s*,/g, ',');
}

function safeDecodeUriComponent(value) {
    try {
        return decodeURIComponent(value);
    } catch(error) {
        return value;
    }
}

function extractGoogleMapsPlaceQuery(url) {
    const match = String(url || '').match(/\/maps\/place\/([^/?#]+)/i);

    if(!match) {
        return null;
    }

    return cleanGoogleMapsPlaceQuery(safeDecodeUriComponent(match[1]));
}

function calculateShippingCost(distanceInKm) {
    const chargedKm = distanceInKm > 0
        ? Math.ceil(distanceInKm)
        : 0;

    return BASE_SHIPPING + (chargedKm * SHIPPING_PER_KM);
}

async function calculateRouteDistanceInKm(origin, destination) {
    try {
        const coordinates = [
            `${origin.longitude},${origin.latitude}`,
            `${destination.longitude},${destination.latitude}`
        ].join(';');

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

        return Number.isFinite(distanceInMeters)
            ? distanceInMeters / 1000
            : null;
    } catch(error) {
        return null;
    }
}

function isValidCoordinate(latitude, longitude) {
    return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
}

function coordinatesFromMatch(match) {
    if(!match) {
        return null;
    }

    const latitude = parseFloat(match[1]);
    const longitude = parseFloat(match[2]);

    if(!isValidCoordinate(latitude, longitude)) {
        return null;
    }

    return { latitude, longitude };
}

function normalizeGoogleMapsText(text) {
    return String(text || '')
        .replace(/&amp;/g, '&')
        .replace(/%21/gi, '!')
        .replace(/%2C/gi, ',')
        .replace(/%2F/gi, '/')
        .replace(/%3A/gi, ':')
        .replace(/%40/gi, '@');
}

function parseGoogleMapsCoordinates(text) {
    const value = normalizeGoogleMapsText(text);
    const googlePlaceMatch = value.match(/!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/);

    if(googlePlaceMatch) {
        return coordinatesFromMatch(googlePlaceMatch);
    }

    const googlePreviewMatch = value.match(/!2d(-?\d{1,3}(?:\.\d+)?)!3d(-?\d{1,2}(?:\.\d+)?)/);

    if(googlePreviewMatch) {
        return coordinatesFromMatch([
            googlePreviewMatch[0],
            googlePreviewMatch[2],
            googlePreviewMatch[1]
        ]);
    }

    const atCoordinateMatch = value.match(/@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);

    if(atCoordinateMatch) {
        return coordinatesFromMatch(atCoordinateMatch);
    }

    return null;
}

function canUseGenericCoordinatePattern(text) {
    const value = String(text || '').toLowerCase();

    if(value.includes('<!doctype') || value.includes('<html')) {
        return false;
    }

    if(value.includes('google.com/maps') || value.includes('maps.app.goo.gl') || value.includes('goo.gl/maps')) {
        return value.includes('q=') || value.includes('query=') || value.includes('@');
    }

    return true;
}

function parseCoordinates(text) {
    const coordinate = parseGoogleMapsCoordinates(text);

    if(coordinate) {
        return coordinate;
    }

    if(canUseGenericCoordinatePattern(text)) {
        const genericCoordinate = coordinatesFromMatch(
            normalizeGoogleMapsText(text).match(COORDINATE_PATTERN)
        );

        if(genericCoordinate) {
            return genericCoordinate;
        }
    }

    try {
        const decodedText = decodeURIComponent(String(text || ''));
        const decodedCoordinate = parseGoogleMapsCoordinates(decodedText);

        if(decodedCoordinate) {
            return decodedCoordinate;
        }

        if(canUseGenericCoordinatePattern(decodedText)) {
            return coordinatesFromMatch(decodedText.match(COORDINATE_PATTERN));
        }

        return null;
    } catch(error) {
        return null;
    }
}

function getPlusCode(text) {
    return String(text || '').toUpperCase().match(PLUS_CODE_PATTERN)?.[1] || null;
}

function encodePlusCode(latitude, longitude) {
    let lat = Math.min(Math.max(latitude, -90), 90) + 90;
    let lng = longitude;

    while(lng < -180) {
        lng += 360;
    }

    while(lng >= 180) {
        lng -= 360;
    }

    lng += 180;

    let code = '';

    for(const resolution of PLUS_CODE_PAIR_RESOLUTIONS) {
        const latDigit = Math.floor(lat / resolution);
        const lngDigit = Math.floor(lng / resolution);

        code += PLUS_CODE_ALPHABET[latDigit] + PLUS_CODE_ALPHABET[lngDigit];
        lat -= latDigit * resolution;
        lng -= lngDigit * resolution;
    }

    return `${code.slice(0, PLUS_CODE_SEPARATOR_POSITION)}+${code.slice(PLUS_CODE_SEPARATOR_POSITION)}`;
}

function decodeFullPlusCode(code) {
    const cleanCode = String(code || '').toUpperCase().replace('+', '').replace(/0/g, '');
    const pairCode = cleanCode.slice(0, 10);

    if(pairCode.length < 2 || pairCode.length % 2 !== 0) {
        return null;
    }

    let lat = -90;
    let lng = -180;
    let lastResolution = PLUS_CODE_PAIR_RESOLUTIONS[0];

    for(let index = 0; index < pairCode.length; index += 2) {
        const resolutionIndex = index / 2;
        const resolution = PLUS_CODE_PAIR_RESOLUTIONS[resolutionIndex];
        const latDigit = PLUS_CODE_ALPHABET.indexOf(pairCode[index]);
        const lngDigit = PLUS_CODE_ALPHABET.indexOf(pairCode[index + 1]);

        if(latDigit < 0 || lngDigit < 0 || !resolution) {
            return null;
        }

        lat += latDigit * resolution;
        lng += lngDigit * resolution;
        lastResolution = resolution;
    }

    return {
        latitude: lat + (lastResolution / 2),
        longitude: lng + (lastResolution / 2),
        resolution: lastResolution
    };
}

function decodePlusCodeNearStore(text) {
    const plusCode = getPlusCode(text);

    if(!plusCode) {
        return null;
    }

    const separatorIndex = plusCode.indexOf('+');
    const missingPrefixLength = PLUS_CODE_SEPARATOR_POSITION - separatorIndex;
    const fullCode = missingPrefixLength > 0
        ? `${encodePlusCode(STORE_LOCATION.latitude, STORE_LOCATION.longitude).replace('+', '').slice(0, missingPrefixLength)}${plusCode}`
        : plusCode;

    const decoded = decodeFullPlusCode(fullCode);

    if(!decoded) {
        return null;
    }

    let { latitude, longitude } = decoded;
    const areaToEdge = decoded.resolution / 2;

    if(latitude - STORE_LOCATION.latitude > areaToEdge) {
        latitude -= decoded.resolution;
    } else if(STORE_LOCATION.latitude - latitude > areaToEdge) {
        latitude += decoded.resolution;
    }

    if(longitude - STORE_LOCATION.longitude > areaToEdge) {
        longitude -= decoded.resolution;
    } else if(STORE_LOCATION.longitude - longitude > areaToEdge) {
        longitude += decoded.resolution;
    }

    return { latitude, longitude };
}

function getMapUrls(text) {
    return String(text || '').match(MAPS_URL_PATTERN) || [];
}

export function hasMapLocation(text) {
    const value = String(text || '').toLowerCase();

    return Boolean(
        parseCoordinates(text) ||
        getPlusCode(text) ||
        value.includes('maps.app.goo.gl') ||
        value.includes('google.com/maps') ||
        value.includes('goo.gl/maps')
    );
}

async function expandMapUrl(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': GOOGLE_MAPS_USER_AGENT
            },
            maxRedirects: 10,
            timeout: 10000,
            validateStatus: status => status >= 200 && status < 400
        });

        return {
            finalUrl: response.request?.res?.responseUrl || response.headers?.location || url,
            html: response.data
        };
    } catch(error) {
        return null;
    }
}

async function findCoordinatesFromGoogleMapsPlace(address) {
    try {
        const response = await axios.get(
            `https://www.google.com/maps/place/${encodeURIComponent(normalizeAddress(address))}`,
            {
                headers: {
                    'User-Agent': GOOGLE_MAPS_USER_AGENT
                },
                maxRedirects: 10,
                timeout: 10000,
                validateStatus: status => status >= 200 && status < 400
            }
        );

        return parseCoordinates([
            response.request?.res?.responseUrl,
            response.data
        ].filter(Boolean).join('\n'));
    } catch(error) {
        return null;
    }
}

async function findCoordinatesFromMaps(address) {
    const directCoordinate = parseCoordinates(address);

    if(directCoordinate) {
        return directCoordinate;
    }

    const urls = getMapUrls(address);

    for(const url of urls) {
        const urlCoordinate = parseCoordinates(url);

        if(urlCoordinate) {
            return urlCoordinate;
        }

        const expanded = await expandMapUrl(url);

        if(!expanded) {
            continue;
        }

        const placeQuery = extractGoogleMapsPlaceQuery(expanded.finalUrl);

        if(placeQuery) {
            const placeLocation = await findLocation(placeQuery);

            if(placeLocation) {
                return {
                    latitude: parseFloat(placeLocation.lat),
                    longitude: parseFloat(placeLocation.lon)
                };
            }

            const compactPlaceQuery = placeQuery.split(',').slice(0, 3).join(', ');
            const compactPlaceLocation = await findLocation(compactPlaceQuery);

            if(compactPlaceLocation) {
                return {
                    latitude: parseFloat(compactPlaceLocation.lat),
                    longitude: parseFloat(compactPlaceLocation.lon)
                };
            }
        }

        const finalUrlCoordinate = parseCoordinates(expanded.finalUrl);

        if(finalUrlCoordinate) {
            return finalUrlCoordinate;
        }

        const htmlCoordinate = parseCoordinates(expanded.html);

        if(htmlCoordinate) {
            return htmlCoordinate;
        }
    }

    if(getPlusCode(address)) {
        const googleMapsCoordinate = await findCoordinatesFromGoogleMapsPlace(address);

        if(googleMapsCoordinate) {
            return googleMapsCoordinate;
        }

        const plusCodeCoordinate = decodePlusCodeNearStore(address);

        if(plusCodeCoordinate) {
            return plusCodeCoordinate;
        }
    }

    return null;
}

function buildSearchQueries(address) {
    const normalizedAddress = normalizeAddress(address);
    const lowerAddress = normalizedAddress.toLowerCase();
    const queries = [normalizedAddress];

    if(!lowerAddress.includes('bogor') && !lowerAddress.includes('indonesia')) {
        queries.push(`${normalizedAddress}, Cilibende, Bogor Tengah, Bogor, Jawa Barat, Indonesia`);
        queries.push(`${normalizedAddress}, Babakan, Bogor Tengah, Bogor, Jawa Barat, Indonesia`);
        queries.push(`${normalizedAddress}, ${DEFAULT_LOCATION_CONTEXT}`);
    }

    if(/\bipb\b/i.test(normalizedAddress)) {
        queries.push(
            `${normalizedAddress.replace(/\bipb\b/ig, 'Institut Pertanian Bogor')}, ${DEFAULT_LOCATION_CONTEXT}`
        );
    }

    if(/\basrama\b/i.test(normalizedAddress) && /\bipb\b/i.test(normalizedAddress)) {
        queries.push(`Asrama PPKU IPB, Dramaga, ${DEFAULT_LOCATION_CONTEXT}`);
    }

    return [...new Set(queries.filter(Boolean))];
}

async function findLocation(address) {
    const searchQueries = buildSearchQueries(address);

    for(const query of searchQueries) {
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
            return response.data[0];
        }
    }

    return null;
}

export async function calculateShipping(address) {
    try {
        const localAddressAlias = findLocalAddressAlias(address);
        const mapsCoordinate = await findCoordinatesFromMaps(address);
        const location = localAddressAlias || mapsCoordinate || await findLocation(address);

        if(!location) {
            return {
                success: false,
                message: 'Alamat tidak ditemukan'
            };
        }

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
