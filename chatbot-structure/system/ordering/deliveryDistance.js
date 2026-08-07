import { calculateShipping } from '../shippingCalculator.js';

export const MAX_DELIVERY_DISTANCE_KM = 5.3;

export async function isDeliveryWithinRange(address) {
    const result = await calculateShipping(String(address || '').toLowerCase());

    if(!result.success) {
        return {
            isWithinRange: true,
            distance: null
        };
    }

    const distance = Number(result.distance);

    return {
        isWithinRange: Number.isFinite(distance) && distance <= MAX_DELIVERY_DISTANCE_KM,
        distance
    };
}
