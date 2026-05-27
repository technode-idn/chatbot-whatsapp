
import axios from "axios";

export const aiStatus = {};

export async function aiMode(text) {
    try {
        console.log("Mau kirim ke FastApi")
    
        const response = await axios.post(
            'http://127.0.0.1:8000/predict',
            {
                message: text
            }
        );
    
        const intent = response.data.intent;
    
        return intent;

    } catch(error) {
        console.log(error);
        return 'Server Chatbot Error';
    }
}