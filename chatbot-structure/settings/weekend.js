export function isWeekend() {
    const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        weekday: 'short'
    }).format(new Date());

    return weekday === 'Sat' || weekday === 'Sun';
}
