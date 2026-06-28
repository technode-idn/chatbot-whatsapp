import ResponseQueue from "./guardians/responseQueue.js";

let response = null;

export function initializeResponse(client, logger) {
    response = new ResponseQueue(client, logger);

    response.start();
}

export function getResponse() {
    return response;
}