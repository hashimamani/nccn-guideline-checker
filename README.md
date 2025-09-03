# Oncology Care Plan

An Angular app that takes a free‑text cancer diagnosis (e.g., “triple negative breast cancer stage IV”) and returns suggested workup, treatment modalities, surveillance, and follow‑up. The UI calls a minimal Node backend which in turn calls OpenAI APIs.

Note: Outputs are AI‑generated, not official NCCN guidance. Validate clinically before use.

## Getting Started

Prereqs: Node 18+ and npm.

1) Backend
- Copy server/.env.example to server/.env and set `OPENAI_API_KEY`.
- Install deps and start server:
  - `cd server`
  - `npm install`
  - `npm run dev`

2) Frontend
- In another terminal:
  - `cd frontend`
  - `npm install`
  - `npm start`

Frontend runs at http://localhost:4200 and proxies `/api` to the backend at http://localhost:3000.

## Structure
- `frontend/`: Angular 17 app with a simple form and results view.
- `server/`: Express server that calls OpenAI’s API with your key.

## Config
- Dev proxy: `frontend/proxy.conf.json`
- OpenAI key: `server/.env`

## Disclaimer
- This is for prototyping and education. It does not replace clinical judgment or official guidelines.
