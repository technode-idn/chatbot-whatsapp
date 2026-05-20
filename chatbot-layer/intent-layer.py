from sklearn.preprocessing import LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
import json
import joblib

X_pattern = []
y_tag = []

with open("chatbot-layer/data/data.json", "r") as file:
    data = json.load(file)

new_data = data["intents"]

for tag in new_data:
    for pattern in tag["pattern"]:
        X_pattern.append(pattern.strip().lower())
        y_tag.append(tag["tag"].strip().lower())

vectorizer = TfidfVectorizer()
encoder = LabelEncoder()

X = vectorizer.fit_transform(X_pattern)
y = encoder.fit_transform(y_tag)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = LogisticRegression()
model.fit(X_train, y_train)

joblib.dump(model, 'chatbot-layer/models/model.pkl');
joblib.dump(vectorizer, 'chatbot-layer/models/vectorizer.pkl');
joblib.dump(encoder, 'chatbot-layer/models/encoder.pkl');