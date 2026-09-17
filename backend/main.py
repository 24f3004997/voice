import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from model import analyze_audio_file

app = FastAPI(title="VoxShield API")

# Setup CORS to communicate with React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {"wav", "mp3", "m4a", "flac", "ogg", "webm"}

@app.post("/api/analyse")
async def analyse_audio(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported audio file format.")
    
    # Save temporary file for feature extraction
    temp_path = f"temp_{file.filename}"
    try:
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)
            
        result = analyze_audio_file(content, temp_path)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)