const OPENING_HOUR = 10;
const CLOSING_HOUR = 16;

export function isOutsideOperationalHours() {
    const currentHour = new Date().getHours();

    return currentHour < OPENING_HOUR || currentHour >= CLOSING_HOUR;
}
