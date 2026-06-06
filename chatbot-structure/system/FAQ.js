
import axios from "axios";

export async function faq(text) {
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