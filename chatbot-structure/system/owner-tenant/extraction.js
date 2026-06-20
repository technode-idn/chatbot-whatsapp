import { addStock } from "./stock.js";

export async function extraction(text) {
    try {
        const data = {};
        const lines = text.split('\n').map(item => item.trim());
    
        for(const line of lines) {
            if(!line.includes(':')) {
                continue;
            }
    
            const [key, ...valueParts] = line.split(':');
            const normalizedKey = key
                .toLowerCase()
                .trim()
    
            if(normalizedKey) {
                data[normalizedKey] = valueParts.join(':').trim();
            }
        }
    
        if(!Object.keys(data).length) {
            return 'Format yang dikirim tidak sesuai, silahkan isi ulang kembali';
        }
    
        await addStock(data);
    
        return;
    } catch(error) {
        console.log(error);
    
        return 'Format yang dikirim tidak sesuai, silahkan isi ulang kembali';
    }
}