"""
GEM API Server — FastAPI wrapper around the existing scoring engine.

Thin layer. Does NOT re-implement scoring logic. Calls gem_eval.py and
report_generator.py directly as Python imports.

Run:
    cd gem-app/server
    uvicorn main:app --reload --port 8000
"""

import json
import os
import sys
import shutil
import uuid
import tempfile
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── Path Setup ──────────────────────────────────────────────────────────────────
# Add the autoresearch src/ to Python path so we can import the engine directly
ENGINE_DIR = Path(os.environ.get("AUTORESEARCH_DIR", "")).resolve() if os.environ.get("AUTORESEARCH_DIR") else Path(__file__).resolve().parent.parent / "autoresearch"
sys.path.insert(0, str(ENGINE_DIR / "src"))
os.chdir(str(ENGINE_DIR))  # engine expects CWD = autoresearch root

# ─── Config ──────────────────────────────────────────────────────────────────────
API_SECRET = os.environ.get("GEM_API_SECRET", "")
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,https://app.gem.studio",
).split(",")

# ─── App ─────────────────────────────────────────────────────────────────────────
app = FastAPI(title="GEM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _verify_api_secret(request: Request):
    """Verify the shared secret between Next.js and FastAPI (production only)."""
    if not API_SECRET:
        return  # No secret configured — skip (local dev)
    provided = request.headers.get("X-API-Secret", "")
    if provided != API_SECRET:
        raise HTTPException(status_code=403, detail="Invalid API secret")


@app.get("/health")
async def health():
    """Health check endpoint for Docker / load balancer."""
    return {"status": "ok", "engine_dir": str(ENGINE_DIR)}

# ─── Storage ─────────────────────────────────────────────────────────────────────
UPLOADS_DIR = ENGINE_DIR / "data" / "uploads"
REPORTS_DIR = ENGINE_DIR / "data" / "reports"
JOBS_DIR    = ENGINE_DIR / "data" / "jobs"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
JOBS_DIR.mkdir(parents=True, exist_ok=True)


# ─── Models ──────────────────────────────────────────────────────────────────────

class JobStatus(BaseModel):
    job_id: str
    show_id: str
    status: str  # pending | processing | completed | failed
    error: Optional[str] = None
    report: Optional[dict] = None
    created_at: str
    completed_at: Optional[str] = None


# ─── Engine Integration ──────────────────────────────────────────────────────────

def run_scoring_pipeline(job_id: str, file_path: Path, show_id: str, use_llm: bool = True):
    """
    Run the full GEM scoring + report pipeline.
    Called as a background task. Updates job status file on disk.
    """
    job_file = JOBS_DIR / f"{job_id}.json"

    try:
        # Update status → processing
        job_data = json.loads(job_file.read_text())
        job_data["status"] = "processing"
        job_file.write_text(json.dumps(job_data, indent=2))

        # Import engine modules (deferred so server starts fast)
        import gem_eval as ge
        import report_generator as rg

        # Step 1: Extract text
        text = ge.extract_text(file_path)

        # Step 2: Score the script
        score_path = ge.PER_SCRIPT_DIR / f"{show_id}.json"
        ge.PER_SCRIPT_DIR.mkdir(parents=True, exist_ok=True)

        if score_path.exists():
            existing = json.loads(score_path.read_text())
            if existing.get("status") == "success":
                pass  # Use cached scores
            else:
                score_path.unlink()

        if not score_path.exists():
            config = ge.load_scoring_config()
            new_dims = ge.load_new_dimensions()
            score_record = ge.score_script(show_id, text, config, new_dims)
            score_path.write_text(json.dumps(score_record, indent=2))

        # Step 3: Generate report
        report = rg.build_report(show_id, use_llm=use_llm)
        report_path = REPORTS_DIR / f"{show_id}.json"
        report_path.write_text(json.dumps(report, indent=2))

        # Update job → completed
        job_data["status"] = "completed"
        job_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        job_data["report_id"] = show_id
        job_file.write_text(json.dumps(job_data, indent=2))

    except Exception as e:
        import traceback
        error_detail = str(e)
        # Translate technical errors into clean, user-safe messages
        if "429" in error_detail or "rate limit" in error_detail.lower():
            error_detail = "The analysis service is temporarily unavailable. Please try again in a few minutes."
        elif "AuthenticationError" in type(e).__name__ or "401" in error_detail:
            error_detail = "The analysis service is not properly configured. Please contact support."
        elif "OPENAI_API_KEY" in error_detail or "api_key" in error_detail.lower() or "export " in error_detail:
            error_detail = "The analysis service is not properly configured. Please contact support."
        elif "timeout" in error_detail.lower():
            error_detail = "Analysis timed out. The script may be too large — try a shorter excerpt or try again."
        elif len(error_detail) > 200 or "\n" in error_detail:
            # Any other verbose / multi-line internal error: keep it generic
            error_detail = "Analysis failed due to an internal error. Please try again."
        print(f"[GEM] Job {job_id} failed: {error_detail}")
        print(traceback.format_exc())
        job_data = json.loads(job_file.read_text())
        job_data["status"] = "failed"
        job_data["error"] = error_detail
        job_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        job_file.write_text(json.dumps(job_data, indent=2))


# ─── Routes ──────────────────────────────────────────────────────────────────────

@app.post("/api/evaluate")
async def evaluate_script(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    show_id: Optional[str] = None,
    user_id: Optional[str] = None,
):
    """
    Upload a script file and start evaluation.
    Returns immediately with a job_id. Poll /api/jobs/{job_id} for status.
    """
    _verify_api_secret(request)
    # Validate file type
    ext = Path(file.filename or "").suffix.lower()
    if ext not in (".pdf", ".txt", ".md", ".fountain"):
        raise HTTPException(400, f"Unsupported file type: {ext}. Upload PDF or TXT.")

    # Derive show_id from filename if not provided
    if not show_id:
        import re
        name = Path(file.filename or "script").stem
        show_id = re.sub(r"[^\w\-]", "-", name)
        show_id = re.sub(r"-+", "-", show_id).strip("-").lower()

    # Save uploaded file
    job_id = str(uuid.uuid4())
    upload_dir = UPLOADS_DIR / job_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / (file.filename or f"script{ext}")

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Create job record
    job_data = {
        "job_id": job_id,
        "show_id": show_id,
        "user_id": user_id,
        "filename": file.filename,
        "file_size": len(content),
        "status": "pending",
        "error": None,
        "report_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
    }
    (JOBS_DIR / f"{job_id}.json").write_text(json.dumps(job_data, indent=2))

    # Run scoring in background
    use_llm = bool(os.environ.get("OPENAI_API_KEY"))
    background_tasks.add_task(run_scoring_pipeline, job_id, file_path, show_id, use_llm)

    return {"job_id": job_id, "show_id": show_id, "status": "pending"}


@app.get("/api/jobs/{job_id}")
async def get_job_status(request: Request, job_id: str, user_id: Optional[str] = None):
    """Poll job status. Returns report when complete."""
    _verify_api_secret(request)
    job_file = JOBS_DIR / f"{job_id}.json"
    if not job_file.exists():
        raise HTTPException(404, "Job not found")

    job_data = json.loads(job_file.read_text())

    # User scoping: only return jobs that belong to this user
    if user_id and job_data.get("user_id") and job_data["user_id"] != user_id:
        raise HTTPException(404, "Job not found")

    # If completed, include the report
    if job_data["status"] == "completed" and job_data.get("report_id"):
        report_path = REPORTS_DIR / f"{job_data['report_id']}.json"
        if report_path.exists():
            job_data["report"] = json.loads(report_path.read_text())

    return job_data


@app.get("/api/reports/{show_id}")
async def get_report(request: Request, show_id: str, user_id: Optional[str] = None):
    """Retrieve a completed report by show_id."""
    _verify_api_secret(request)
    report_path = REPORTS_DIR / f"{show_id}.json"
    if not report_path.exists():
        raise HTTPException(404, "Report not found")
    return json.loads(report_path.read_text())


@app.get("/api/reports")
async def list_reports(request: Request, user_id: Optional[str] = None):
    """List reports filtered by user_id."""
    _verify_api_secret(request)
    # Build a map of show_id → user_id from job files so we can filter reports
    show_user_map: dict = {}
    for jf in JOBS_DIR.glob("*.json"):
        try:
            jd = json.loads(jf.read_text())
            if jd.get("show_id") and jd.get("user_id"):
                show_user_map[jd["show_id"]] = jd["user_id"]
        except Exception:
            pass

    reports = []
    for f in sorted(REPORTS_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            data = json.loads(f.read_text())
            show_id = data.get("show_id", f.stem)
            # Only show reports that explicitly belong to this user
            if user_id and show_user_map.get(show_id) != user_id:
                continue
            reports.append({
                "show_id": show_id,
                "verdict": data.get("verdict", {}).get("label"),
                "weighted_score": data.get("verdict", {}).get("weighted_score"),
                "percentile": data.get("verdict", {}).get("percentile"),
                "generated_at": data.get("generated_at"),
            })
        except Exception:
            pass
    return {"reports": reports}


@app.get("/api/jobs")
async def list_jobs(request: Request, user_id: Optional[str] = None):
    """List jobs filtered by user_id."""
    _verify_api_secret(request)
    jobs = []
    for f in sorted(JOBS_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            data = json.loads(f.read_text())
            if user_id:
                # Only show jobs that explicitly belong to this user
                if data.get("user_id") != user_id:
                    continue
            jobs.append(data)
        except Exception:
            pass
    return {"jobs": jobs}
