# Multilingual Conversation Transcriber

An audio-only multilingual conversation transcription system with speaker diarization (`pyannote.audio`) and per-turn language detection (`WhisperX` / `faster-whisper`), built with **Next.js (TypeScript + Tailwind CSS)** and **FastAPI**.

## Quick Start (Windows PowerShell)

### 1. Backend Setup
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt

# For NVIDIA GPU (recommended):
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install whisperx

# Add your Hugging Face token in backend/.env (required for pyannote speaker diarization)
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser. Ensure `ffmpeg` is installed (`winget install Gyan.FFmpeg`).
