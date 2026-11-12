# app/schemas/solver_schemas.py
"""Pydantic request/response schemas for the optimizer API."""

from __future__ import annotations
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
from datetime import date


class RoleRequirement(BaseModel):
    role: str
    count: int = Field(ge=0)
    requiredSkills: List[str] = []
    isMandatory: bool = True


class ShiftTemplateInfo(BaseModel):
    id: str
    name: str
    shiftType: str  # morning / evening / night / custom
    startTime: str  # HH:MM
    endTime: str    # HH:MM
    durationHours: float
    crossesMidnight: bool = False
    department: Optional[str] = None
    requirements: List[RoleRequirement] = []


class ShiftRequirementInfo(BaseModel):
    id: str
    department: str
    shiftTemplate: str
    dayOfWeek: Optional[int] = None  # 0=Sun..6=Sat
    roleRequirements: List[RoleRequirement] = []


class EmployeeInfo(BaseModel):
    id: str
    name: str
    jobCategory: str
    department: str
    eligibleDepartments: List[str] = []
    skills: List[str] = []
    qualifications: List[str] = []
    contractedHoursPerWeek: float = 40.0
    maxHoursPerWeek: float = 48.0
    maxHoursPerDay: float = 12.0
    minRestHoursBetweenShifts: float = 11.0
    preferredShifts: List[str] = []
    historicalNightShifts: int = 0
    historicalWeekendShifts: int = 0
    historicalOvertimeHours: float = 0.0


class ApprovedLeave(BaseModel):
    employee: str
    startDate: str  # YYYY-MM-DD
    endDate: str    # YYYY-MM-DD


class DepartmentInfo(BaseModel):
    id: str
    name: str
    code: str


class SchedulingRules(BaseModel):
    minRestHours: float = 11.0
    maxHoursPerWeek: float = 48.0
    maxConsecutiveDays: int = 6
    maxNightShiftsPerWeek: int = 3


class SolverConfig(BaseModel):
    timeLimitSeconds: int = Field(default=60, ge=1, le=600)
    workers: int = Field(default=4, ge=1, le=16)


class SchedulingHorizon(BaseModel):
    startDate: str  # YYYY-MM-DD
    endDate: str    # YYYY-MM-DD


class SolveRequest(BaseModel):
    employees: List[EmployeeInfo]
    departments: List[DepartmentInfo]
    shiftTemplates: List[ShiftTemplateInfo]
    shiftRequirements: List[ShiftRequirementInfo]
    approvedLeave: List[ApprovedLeave] = []
    schedulingRules: SchedulingRules = SchedulingRules()
    horizon: SchedulingHorizon
    solverConfig: SolverConfig = SolverConfig()


# ── Response schemas ──────────────────────────────────────────────────────────

class AssignmentResult(BaseModel):
    employeeId: str
    departmentId: str
    shiftTemplateId: str
    date: str           # YYYY-MM-DD
    startDatetime: str  # ISO 8601
    endDatetime: str    # ISO 8601
    shiftType: str
    overtimeHours: float = 0.0


class FairnessMetrics(BaseModel):
    nightShiftVariance: float
    weekendShiftVariance: float
    overtimeVariance: float
    workloadImbalanceScore: float
    perEmployee: Dict[str, Any] = {}


class SolverMetrics(BaseModel):
    executionTimeMs: int
    objectiveValue: Optional[float] = None
    totalAssigned: int
    totalUnfilled: int
    feasibilityScore: Optional[float] = None
    fairness: Optional[FairnessMetrics] = None


class ShortageInfo(BaseModel):
    department: str
    date: str
    shiftTemplate: str
    role: str
    required: int
    available: int


class SolverDiagnostics(BaseModel):
    infeasibleReasons: List[str] = []
    departmentShortages: List[ShortageInfo] = []
    suggestions: List[str] = []


class SolveResponse(BaseModel):
    status: str  # OPTIMAL / FEASIBLE / INFEASIBLE / UNKNOWN
    assignments: List[AssignmentResult] = []
    metrics: SolverMetrics
    diagnostics: SolverDiagnostics = SolverDiagnostics()
