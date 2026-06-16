import { pendingOrders } from "../../settings/globalVariables";

export function deleteOrder(orderDataAvailable, orderId) {
    const orderData = pendingOrders[orderId]["data"];

    for(const orderKey of orderDataAvailable) {
        if(orderKey in orderData) {
            delete orderData[orderKey]
        }
    }

    orderData["order_id"] = orderId;
    
    return;
}