# Dental X-Ray Review

A web application for reviewing tooth annotations on dental X-rays. Reviewers can inspect marked teeth, flag annotation problems, answer image-level questions, and download the collected responses as an Excel workbook.

![Dental X-Ray Review gallery](docs/screenshot.png)

![Dental X-Ray Review image review](docs/screenshot-review.png)

## Features

- Browse the available annotated X-rays.
- View the raw image or the annotation overlay.
- Show or hide tooth numbers.
- Check each tooth's assigned type.
- Flag teeth with a wrong type, an incorrect boundary, or an uncertain annotation.
- Record missing teeth and marks that do not look like teeth.
- Save and edit completed reviews.
- Export saved responses to Excel.

## Reviewing an image

1. Enter the reviewer name at the top of the page.
2. Select **Start review** on an X-ray.
3. Use the image controls to show or hide the overlay and tooth numbers.
4. Select a tooth row to flag it and provide correction details.
5. Answer the image-level questions in the **About this X-ray** section.
6. Select **Save and mark complete**.
7. Use **Download responses (Excel)** on the gallery page to export saved reviews.

Reviews are also saved automatically while a reviewer is editing an image. A reviewer name is required before a review can be marked complete.

## Data and persistence

The app uses Netlify Blobs for the shared reviewer name and saved reviews when deployed on Netlify. During plain `next dev`, it falls back to in-memory storage so the interface can be tested locally; that local fallback is lost when the server restarts.

The Excel export includes reviewer details, image details, tooth assignments, flagged issues, image-level answers, comments, and review timestamps.

## Available commands

```bash
npm run dev      # Start the development server
npm run lint     # Run ESLint
npm run build    # Create a production build
npm run start    # Start the production server
```

## Project structure

```text
app/                 Pages, client components, and API routes
lib/hf.ts            Hugging Face dataset access and annotation helpers
lib/blobStore.ts     Review persistence
lib/excelExport.ts   Excel workbook generation
lib/reviewStore.ts   Client-side review state and API integration
public/              Static files
```

## Deployment

The app is designed to run on Netlify. Add `HF_TOKEN` as a server-side environment variable in the Netlify project settings, then deploy the Next.js application. Netlify Blobs must be available to the deployed site for reviews to persist between server restarts.

## Technology

- [Next.js](https://nextjs.org/) 16
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [ExcelJS](https://github.com/exceljs/exceljs)
- [Netlify Blobs](https://docs.netlify.com/blobs/overview/)

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
