import { rawDataFaq } from "../settings/loadFiles.js";

export async function faq(text) {
    const allResponseFaq = rawDataFaq.trim() ? JSON.parse(rawDataFaq) : [];

    const faq_id = allResponseFaq.find(r => r["faq_id"] === text);

    if(!faq_id) {
        return "Menu yang Anda pilih tidak ada di dalam opsi.";
    }

    return faq_id["response"];
}