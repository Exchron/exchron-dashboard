# Exchron Dashboard

A Next.js application featuring a complex dashboard for data analysis with a modern, dark-themed aesthetic.

## Overview

This project implements a dashboard with multiple tabs:

- 01 MONITOR - Overview of model architecture and performance metrics
- 02 SUBMIT - Form for data submission (placeholder)
- 03 ANALYZE - Analysis tools (placeholder)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Features

- Responsive dashboard layout that adapts to different screen sizes
- Card-based UI components with a modern dark theme
- Tab-based navigation between different sections
- Placeholder visualizations for charts and graphs

## Technologies Used

- Next.js
- React
- Tailwind CSS
- TypeScript

## Prediction Flow (Playground Upload -> Results)

Playground data upload integrates with a local ML API at `http://localhost:8000/predict`.

Steps:

1. Go to: Playground > Data Input.
2. Select "Data Upload" mode, choose a CSV file (header + rows). Example header: `Parameter,Value`.
3. Click Evaluate.
4. CSV is parsed client-side (no external CSV library) into `{ records: [...] }`.
5. POST request: `POST http://localhost:8000/predict` with JSON body `{ records: [...] }`.
6. Expected response: either an array or `{ results: [...] }` where each element contains:
   - `probability_confirmed` (0..1)
   - `probability_false_positive` (0..1)
   - Optional extra fields (will be preserved).
7. The results are stored in a React context (`PredictionProvider`) and shown on the Results page in the summary cards and a detailed table.

If the API schema changes, update normalization logic in `src/components/dashboard/playground/datainput.tsx` where the fetch call processes the response before `setResults`.

### Backend Endpoint Configuration

By default the app proxies prediction requests through a Next.js route:

`/api/predict  ->  http://localhost:8000/predict`

Override the upstream URL with an environment variable (add to `.env.local`):

```
PREDICT_API_URL=https://your-backend-host/predict
```

Client components always call `/api/predict`; the server route forwards the JSON body and returns the upstream JSON. A 30s timeout is enforced (504 on timeout).

Returned JSON may be either:

1. An array of prediction objects.
2. An object containing `{ "results": [...] }`.

Each prediction object should include:
`probability_confirmed` and `probability_false_positive` (values 0..1).
