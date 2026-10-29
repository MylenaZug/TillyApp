FROM node:20-bookworm

# build-essential + python3 needed to compile better-sqlite3's native addon
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*
