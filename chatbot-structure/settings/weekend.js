export function isWeekend() {
    const today = new Date().getDay();

    if(today === 0 || today === 6) {
	return true;
    }

    return false;
}