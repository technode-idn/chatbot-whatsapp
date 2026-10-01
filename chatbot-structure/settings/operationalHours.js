const OPENING_HOUR = 10;
const CLOSING_HOUR = 16;

export function isOutsideOperationalHours() {
    const currentHour = Number(new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        hourCycle: 'h23'
    }).format(new Date()));

    return currentHour < OPENING_HOUR || currentHour >= CLOSING_HOUR;
}
