import { addStock, editStock } from "./stock.js";

function normalizeKey(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/^\[\d+\]\s*/, "")
        .replace(/^[^a-z0-9]+/i, '')
        .replace(/[^a-z0-9]+$/i, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function cleanValue(value) {
    return String(value || '')
        .trim()
        .replace(/^\*+|\*+$/g, '')
        .trim();
}

export async function extraction(text, mode = null) {
    try {
        const data = {};
        const lines = text.split('\n').map(item => item.trim());
    
        for(const line of lines) {
            if(!line.includes(':')) {
                continue;
            }
    
            const [key, ...valueParts] = line.split(':');
            const normalizedKey = normalizeKey(key);
    
            if(normalizedKey) {
                data[normalizedKey] = cleanValue(valueParts.join(':'));
            }
        }
    
        if(!Object.keys(data).length) {
            return 'Format yang dikirim tidak sesuai, silahkan isi ulang kembali';
        }
    
        const responseStock = mode === "add" || text.toLowerCase().includes("pengisian")
            ? await addStock(data)
            : await editStock(data);
    
        return responseStock;
    } catch(error) {
        console.log(error);
    
        return 'Format yang dikirim tidak sesuai, silahkan isi ulang kembali';
    }
}
