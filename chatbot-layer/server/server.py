from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import json
import random

model = joblib.load('../models/model.pkl')
vectorizer = joblib.load('../models/vectorizer.pkl')
encoder = joblib.load('../models/encoder.pkl')

with open("../data/data.json", "r") as file:
    data = json.load(file)

new_data = data['intents']

app = FastAPI()

class ChatRequest(BaseModel):
    message: str

@app.post("/predict")

def predict(data: ChatRequest):
    text = data.message.lower()
    vector = vectorizer.transform([text])
    pred = model.predict(vector)
    result = encoder.inverse_transform(pred)[0]

    response_data = "Maaf, saya belum memahami pesan Anda."

    for tag in new_data:
        if tag['tag'] == result:
            response_data = random.choice(tag['response'])


    return { "intent": response_data}