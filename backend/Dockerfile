FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
# v2.1 - migrated google-generativeai → google-genai, dynamic PORT
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Railway sets PORT env var; fall back to 8000 for local dev
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
