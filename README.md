# 🧠 LifeOS – AI-Powered Persistent Memory Agent

> Built for the **Cognee Hangover Hackathon 2026**

LifeOS is an AI-powered persistent memory application that enables Large Language Models (LLMs) to remember information across sessions using **Cognee**. It combines a modern **Next.js** frontend with a **FastAPI** backend, **Google Gemini**, **PostgreSQL**, and **Cognee** to create searchable long-term memory with semantic recall and knowledge graph visualization.

---

## ✨ Features

- 🧠 Persistent AI Memory
- 🔍 Natural Language Semantic Recall
- 📝 Store Notes, Files & URLs
- 🌐 URL-Based Memory Ingestion
- 📊 Interactive Knowledge Graph Visualization
- 🤖 Google Gemini Integration
- ⚡ FastAPI Backend Service
- 💻 Next.js 15 Dashboard
- 🗄 PostgreSQL Database
- 🔗 Cognee Semantic Search Engine

---

# 📂 Project Structure

```
LifeOS/
│
├── cognee-service/
│   ├── main.py
│   ├── packages.txt
│   ├── requirements.txt
│   └── test_recall.py
│
├── screenshots/
│   ├── Dashboard.png
│   ├── Add-memory.png
│   ├── Ask-LifeOS.png
│   └── Knowledge-graph.png
│
├── src/
│   ├── app/
│   ├── db/
│   └── lib/
│
├── drizzle.config.json
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── tsconfig.json
├── .gitignore
├── LICENSE
└── README.md
```

---

# 🛠 Tech Stack

### Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS

### Backend

- FastAPI
- Cognee 1.2.2
- LiteLLM

### AI

- Google Gemini 2.5 Flash
- Gemini Text Embedding 004

### Database

- PostgreSQL
- Drizzle ORM
- LanceDB
- Kuzu Graph Database

---

# 🚀 Installation

## 1. Clone the Repository

```bash
git clone https://github.com/25cs249-create/LifeOS-persistent-memory

cd lifeos
```

---

## 2. Backend Setup

```bash
cd cognee-service

python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file inside `cognee-service`:

```env
GEMINI_API_KEY=YOUR_API_KEY

LLM_PROVIDER=gemini
LLM_MODEL=gemini/gemini-2.5-flash

EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=gemini/text-embedding-004
EMBEDDING_DIMENSIONS=768

VECTOR_DB_PROVIDER=lancedb
GRAPH_DATABASE_PROVIDER=kuzu
```

Start the backend:

```bash
python main.py
```

---

## 3. Frontend Setup

Return to the project root:

```bash
npm install
```

Create a root `.env` file:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/app_db

COGNEE_SERVICE_URL=http://localhost:8001
```

Push the database schema:

```bash
npx drizzle-kit push
```

Start the application:

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

# 📸 Screenshots

## Dashboard

![Dashboard](LifeOS/screenshots/Dashboard.png)

---

## Add Memory

![Add Memory](LifeOS/screenshots/Add-memory.png)

---

## Ask LifeOS

![Ask LifeOS](LifeOS/screenshots/Ask-LifeOS.png)

---

## Knowledge Graph

![Knowledge Graph](LifeOS/screenshots/Knowledge-graph.png)

---

# 💡 How It Works

1. Add a note, file, or URL.
2. The frontend sends it to the FastAPI backend.
3. Cognee processes the content into semantic memory.
4. Google Gemini generates embeddings.
5. Cognee builds knowledge graph relationships.
6. Stored memories become searchable using natural language.

---

# 🧪 Example

### Store Memory

```
My favourite programming language is Python.
```

### Ask

```
What is my favourite programming language?
```

### Response

```
Python
```

---

# ⚠ Known Limitation

During testing on an **Intel Celeron J1800 (Bay Trail)** processor, memory storage and knowledge graph generation worked successfully.

However, semantic recall using LanceDB may fail because LanceDB relies on AVX instructions that are unavailable on older processors. This limitation is hardware-specific and does not affect supported modern CPUs.

---

# 🎯 Future Improvements

- Cloud-based vector database support
- Multi-user authentication
- Chat-style memory assistant
- Memory editing and deletion
- Better knowledge graph visualization
- File summarization
- Memory sharing between users

---

# 👨‍💻 Built For

**Cognee Hangover Hackathon 2026**

Made with ❤️ using **Cognee**, **Google Gemini**, **Next.js**, **FastAPI**, and **PostgreSQL**.
