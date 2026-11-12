# app/main.py
"""FastAPI application entry point for the Hospital Rostering Optimizer."""

import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .routers import solve

load_dotenv()

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Hospital Rostering Optimizer",
    description=(
        "OR-Tools CP-SAT scheduling microservice for the Hospital Staff Rostering system.\n\n"
        "Accepts structured employee, shift, and constraint data and returns an optimized "
        "roster assignment satisfying all hard constraints while optimizing fairness."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(solve.router, tags=["Optimization"])


@app.on_event("startup")
async def startup_event():
    logger.info("Hospital Rostering Optimizer started")
    logger.info("OR-Tools CP-SAT solver ready")
