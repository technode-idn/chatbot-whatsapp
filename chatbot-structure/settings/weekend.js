export async function isWeekend() {
    const today = new Date().getDay();

    return today === 0 || today === 6;
}