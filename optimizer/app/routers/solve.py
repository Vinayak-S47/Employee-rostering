# app/routers/solve.py
"""FastAPI router for the /solve endpoint."""

import logging
from fastapi import APIRouter, HTTPException
from ..schemas.solver_schemas import SolveRequest, SolveResponse
from ..solver.model import HospitalRosterSolver

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/solve", response_model=SolveResponse, summary="Generate optimized hospital roster")
async def solve_roster(request: SolveRequest) -> SolveResponse:
    """
    Accept structured scheduling data and return an optimized roster assignment.

    The solver uses Google OR-Tools CP-SAT to find a feasible assignment satisfying
    all hard constraints, then optimizes soft objectives for fairness.

    Returns:
    - **OPTIMAL**: Best possible solution found within time limit.
    - **FEASIBLE**: A valid solution found (may not be optimal).
    - **INFEASIBLE**: No valid roster exists under the given constraints.
    - **UNKNOWN**: Solver ran out of time without a solution.
    """
    if not request.employees:
        raise HTTPException(status_code=422, detail="At least one employee is required.")
    if not request.shiftTemplates:
        raise HTTPException(status_code=422, detail="At least one shift template is required.")
    if not request.shiftRequirements:
        raise HTTPException(status_code=422, detail="At least one shift requirement is required.")

    try:
        solver = HospitalRosterSolver(request)
        result = solver.solve()
        logger.info(
            f"Solve complete: status={result.status} "
            f"assignments={len(result.assignments)} "
            f"time={result.metrics.executionTimeMs}ms"
        )
        return result
    except Exception as e:
        logger.exception("Solver internal error")
        raise HTTPException(status_code=500, detail=f"Solver error: {str(e)}")


@router.get("/health", summary="Optimizer health check")
async def health():
    return {"status": "ok", "service": "hospital-rostering-optimizer"}
