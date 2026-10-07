FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias del sistema y de build
RUN apt-get update && apt-get install -y gcc g++ && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Descargar modelo de spaCy
RUN python -m spacy download es_core_news_sm

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
