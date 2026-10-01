// Hari libur nasional yang tanggalnya tetap setiap tahun.
// Hari libur bergerak dapat ditambahkan lewat PUBLIC_HOLIDAYS, misalnya:
// PUBLIC_HOLIDAYS=2026-03-19,2026-03-20
const FIXED_PUBLIC_HOLIDAYS = new Set([
    '01-01', // Tahun Baru
    '05-01', // Hari Buruh Internasional
    '06-01', // Hari Lahir Pancasila
    '08-17', // Hari Kemerdekaan Republik Indonesia
    '12-25'  // Hari Natal
]);

function dateKey(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));

    return `${values.year}-${values.month}-${values.day}`;
}

export function isPublicHoliday(date = new Date()) {
    const key = dateKey(date);
    const fixedKey = key.slice(5);
    const configuredHolidays = String(process.env.PUBLIC_HOLIDAYS || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);

    return FIXED_PUBLIC_HOLIDAYS.has(fixedKey) || configuredHolidays.includes(key);
}
