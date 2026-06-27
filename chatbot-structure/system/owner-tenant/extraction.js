import { rawDataTenant } from "../../settings/loadFiles.js";
import { addStock, editStock } from "./stock.js";

const tenants = JSON.parse(rawDataTenant);

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

        const tenant = tenants.find(t => t["store"] === data["tenant"]);
        tenant["status_stock"] = "complete";
    
        if(text.includes("pengisian")) {
            const responseStock = await addStock(data);
        } else {
            const responseStock = await editStock(data);
        }
    
        return responseStock;
    } catch(error) {
        console.log(error);
    
        return 'Format yang dikirim tidak sesuai, silahkan isi ulang kembali';
    }
}