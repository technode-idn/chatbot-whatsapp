import { pendingOrders } from "../../settings/globalVariables.js";

function quantityKeyFromProductKey(productKey) {
    const number = productKey.match(/_(\d+)$/)?.[1];

    return number ? `jumlah_pesanan_${number}` : 'jumlah_pesanan';
}

function hasProductKeys(orderData) {
    return Object.keys(orderData).some(key => key === 'id_produk' || /^id_produk_\d+$/.test(key));
}

export function deleteOrder(orderDataUnavailable, orderId) {
    const pendingOrder = pendingOrders[orderId];

    if(!pendingOrder?.data) {
        return {
            data: null,
            hasProducts: false
        };
    }

    const orderData = pendingOrder.data;

    for(const orderKey of orderDataUnavailable || []) {
        delete orderData[orderKey];
        delete orderData[quantityKeyFromProductKey(orderKey)];
    }

    orderData["order_id"] = orderId;
    pendingOrder.data = orderData;

    return {
        data: orderData,
        hasProducts: hasProductKeys(orderData)
    };
}
