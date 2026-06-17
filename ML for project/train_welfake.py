import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import pickle

print("1. Loading WELFake dataset... (Please wait)")
# تأكد إن اسم الملف هنا مطابق لاسم الملف اللي نزلته
df = pd.read_csv('WELFake_Dataset.csv')

# تنظيف سريع للداتا من أي صفوف فاضية
df = df.dropna(subset=['text', 'label'])

# ---------------------------------------------------------
# خطوة حماية الرامات: هناخد عينة 20 ألف خبر بس لسرعة التدريب
# لو اللاب توب بتاعك قوي جداً (16 جيجا رام فما فوق)، ممكن تمسح السطر ده
print("2. Sampling data to protect RAM...")
df = df.sample(n=20000, random_state=42)
# ---------------------------------------------------------

X = df['text']
y = df['label'] # في WELFake: 1 يعني حقيقي، 0 يعني مزيف

print("3. Vectorizing text (TF-IDF)...")
# استخدام الكلمات الإنجليزية فقط وتقليل الميزات لـ 5000 للسرعة
vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
X_vectorized = vectorizer.fit_transform(X)

print("4. Splitting data (80% Train, 20% Test)...")
X_train, X_test, y_train, y_test = train_test_split(X_vectorized, y, test_size=0.2, random_state=42)

print("5. Training Random Forest... (This might take a minute)")
# n_jobs=-1 بتخلي الموديل يستخدم كل أنوية البروسيسور عشان يخلص أسرع
rf_model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
rf_model.fit(X_train, y_train)

print("6. Evaluating new model...")
y_pred = rf_model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"\n---> Model Accuracy: {acc * 100:.2f}%\n")
print("Classification Report:")
print(classification_report(y_test, y_pred))

print("7. Saving new brain to .pkl files...")
with open('random_forest_model.pkl', 'wb') as f:
    pickle.dump(rf_model, f)

with open('tfidf_vectorizer.pkl', 'wb') as f:
    pickle.dump(vectorizer, f)

print("\nDONE! You can now run your FastAPI server with the new model.")