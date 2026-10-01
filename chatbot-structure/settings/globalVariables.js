export const pendingOrders = {};
export const pendingProof = {};
export const paymentVerificationSession = {};
export const sessions = {};
export const paymentStatus = {};
export const orderConfirmationSession = {};
export const groupSession = {};
export const deliverySession = {};
// Verifikasi ketersediaan kurir sebelum customer melanjutkan ke pembayaran.
export const courierAvailabilitySession = {};
export const courierDecisionSession = {};
export const multipleFormSession = {};
export const editingOrder = {};
export const userMode = {};
export const allNumberOwnerTenant = (rawDataTenant.trim() ? JSON.parse(rawDataTenant) : [])
    .map(tenant => String(tenant?.owner_phone || '').trim())
    .filter(Boolean);
export const allNumberDriverAdmin = ["232731510366286@lid"];
export const formTenantSession = {};
export const tenantOrderConfirmation = {};
// Alias ID WhatsApp hanya untuk tenant yang telah membalas langsung pesan bot.
export const tenantIdentityAliases = {};
export const addressConfirmationSession = {};
export let lastOrderId = null;
export let campusZone = {
    3000: [
        'ca',
        'cb',
        'cc',
        'gg',
        'zeta',
        'sc',
        'student center',
        'amphitheater',
        'selasar',
        'kopvok',
        'kopi vokasi',
        'klikbi',
        'lab hw',
        'lab kimia',
        'lab mikrobiologi',
        'lab mikro',
        'lab biologi',
        'lab ds',
        'pos 1',
        'pos 2',
        'pos 3',
        'lab olah',
        'teras 2 simp',
        'teras simp',
        'koperasi mab',
        'prima',
        'kantin',
        'parkiran'
    ],
    5000: [
        'gymnas',
        'fitspot',
        'kandang',
        'ti',
        'teaching industry',
        'sekolah bisnis',
        'sb',
        'alghif',
        'al-gif',
        'al-ghif',
        'algif',
        'klinik',
        'bak ikn'
    ],
    7000: [
        'baranangsiang',
        'felicia',
        'ekasari',
        'stp',
        'malabar',
        'studio ekowisata',
        'studio ekw'
    ]
};
import { rawDataTenant } from './loadFiles.js';
