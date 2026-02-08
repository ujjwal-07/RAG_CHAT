# RAG Chatbot

A Next.js application with RAG (Retrieval-Augmented Generation) capabilities, using PostgreSQL (pgvector), LangChain, and Hugging Face models.

## Features

- **Authentication**: Secure login and registration using NextAuth.js.
- **RAG Pipeline**: Upload PDF, Docx, or Images. Text is extracted, chunked, embedded, and stored in Postgres.
- **Chat Interface**: Chat with your documents using a vector-based retrieval system.
- **Camera Support**: Capture images directly from the UI for analysis.
- **Vector Search**: Uses `pgvector` for similarity search.

## Setup

1. **Clone the repository** and install dependencies:
   ```bash
   npm install
   ```

2. **Database Setup**:
   - Ensure you have a PostgreSQL database running.
   - Enable `pgvector` extension: `CREATE EXTENSION IF NOT EXISTS vector;`
   - Configure `.env`:
     ```env
     DATABASE_URL="postgresql://user:password@localhost:5432/rag_chatbot"
     NEXTAUTH_SECRET="your-secret"
     HF_ACCESS_TOKEN="your-hugging-face-token"
     ```

3. **Run Migrations**:
   - Push schema to DB:
     ```bash
     npx drizzle-kit push
     ```

4. **Run the App**:
   ```bash
   npm run dev
   ```

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: NextAuth.js v5
- **AI/ML**: LangChain, Hugging Face Inference
- **Styling**: Tailwind CSS
