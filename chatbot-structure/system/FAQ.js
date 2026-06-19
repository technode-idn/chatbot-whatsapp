import { rawDataFaq } from "../settings/loadFiles.js";

export async function faq(text) {
    const allResponseFaq = JSON.parse(rawDataFaq);

    const faq_id = allResponseFaq.find(r => r["faq_id"] === text);

    return faq_id["response"];
}