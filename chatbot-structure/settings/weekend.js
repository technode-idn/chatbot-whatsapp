export function isWeekend() {
    const today = new Date().getDay();

    if(today === 4 || today === 5) {
	    return true;
    }

    return false;
}