# cv-builder

Local single-user CV Builder for generating JD-targeted NZ/AU IT application packages.

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
pytest -v
uvicorn app.main:app --reload
```

## Frontend

```bash
cd frontend
npm install
npm test
npm run dev
```

## AI Provider

The MVP default model is OpenAI `gpt-5.4`. API keys must be provided through environment variables or local-only config. Do not commit or print secret values from `ref/ai.txt`.

## MVP Flow

1. Edit the master CV manually.
2. Create an application run from pasted JD text, uploaded file, job URL, or fixture JSON.
3. Run assisted or auto generation.
4. Review ATS CV, portfolio CV, cover letter, and review result.
5. Export PDFs locally.
