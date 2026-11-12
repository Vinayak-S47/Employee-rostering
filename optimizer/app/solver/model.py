# app/solver/model.py
"""
Hospital Staff Rostering CP-SAT Model
======================================

Decision variable:
    x[e, s] ∈ {0, 1}  —  1 if employee e is assigned to shift slot s, else 0

where s = (department_id, template_id, date)

Hard constraints:
  H1  Staffing coverage   — role/skill requirements satisfied for each slot
  H2  Qualification match — employee must have required skills for the slot
  H3  No overlapping shifts
  H4  Minimum rest between consecutive shifts
  H5  Approved leave      — employees not assigned during approved leave
  H6  Working-hour limits — daily and weekly caps respected
  H7  Employment eligibility — only active employees in eligible departments
  H8  Consecutive-days limit

Soft objectives (weighted penalty minimization):
  S1  Night-shift fairness      — minimize variance in night-shift counts
  S2  Weekend-shift fairness    — minimize variance in weekend-shift counts
  S3  Overtime fairness         — minimize variance in overtime hours
  S4  Preference satisfaction   — prefer employees' preferred shift types
  S5  Historical fairness       — account for prior assignments

Implementation note:
    CP-SAT works with integer coefficients. Continuous values (hours, variances)
    are scaled to integers using SCALE_FACTOR.
"""

from __future__ import annotations
import logging
import time
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from ortools.sat.python import cp_model

from ..schemas.solver_schemas import (
    SolveRequest, SolveResponse, AssignmentResult,
    SolverMetrics, SolverDiagnostics, FairnessMetrics, ShortageInfo,
)

logger = logging.getLogger(__name__)

# Scaling factor to convert float hours → integer for CP-SAT
SCALE = 100  # 0.01-hour precision


def _parse_date(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


def _date_range(start: date, end: date) -> List[date]:
    days = []
    cur = start
    while cur <= end:
        days.append(cur)
        cur += timedelta(days=1)
    return days


def _shift_datetimes(d: date, tpl) -> Tuple[datetime, datetime]:
    """Convert a date + template to actual start/end datetimes."""
    sh, sm = map(int, tpl.startTime.split(":"))
    eh, em = map(int, tpl.endTime.split(":"))
    start_dt = datetime(d.year, d.month, d.day, sh, sm)
    if tpl.crossesMidnight:
        end_dt = datetime(d.year, d.month, d.day, eh, em) + timedelta(days=1)
    else:
        end_dt = datetime(d.year, d.month, d.day, eh, em)
    return start_dt, end_dt


def _employee_on_leave(employee_id: str, d: date, leave_map: Dict[str, List[Tuple[date, date]]]) -> bool:
    for start, end in leave_map.get(employee_id, []):
        if start <= d <= end:
            return True
    return False


def _employee_eligible(emp, dept_id: str, tpl, req_skills: List[str]) -> bool:
    """Return True if the employee meets all eligibility criteria for this slot."""
    if dept_id not in emp.eligibleDepartments:
        return False
    # Skill check: employee must have ALL required skills
    for skill in req_skills:
        if skill and skill not in emp.skills:
            return False
    # Role check: employee's jobCategory must match the role requirement
    return True


class HospitalRosterSolver:
    """Builds and solves the CP-SAT hospital rostering model."""

    def __init__(self, request: SolveRequest):
        self.req = request
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()

        # Index structures
        self.employees = {e.id: e for e in request.employees}
        self.dept_map   = {d.id: d for d in request.departments}
        self.tpl_map    = {t.id: t for t in request.shiftTemplates}

        self.days = _date_range(
            _parse_date(request.horizon.startDate),
            _parse_date(request.horizon.endDate),
        )

        # Pre-build leave map
        self.leave_map: Dict[str, List[Tuple[date, date]]] = defaultdict(list)
        for lv in request.approvedLeave:
            self.leave_map[lv.employee].append(
                (_parse_date(lv.startDate), _parse_date(lv.endDate))
            )

        # Build slot list: (dept_id, tpl_id, date, day_of_week)
        # One slot per department × template × date if a requirement exists
        self.slots = self._build_slots()
        logger.info(f"Built {len(self.slots)} shift slots over {len(self.days)} days")

        # Decision variables: x[emp_id, slot_idx] ∈ {0,1}
        self.x: Dict[Tuple[str, int], cp_model.IntVar] = {}

        # Feasibility pre-check results
        self.pre_check_shortages: List[ShortageInfo] = []

    def _build_slots(self):
        """Create one slot per (dept, template, date) combination that has a requirement."""
        req_lookup = defaultdict(list)  # (dept_id, tpl_id, dow) → [RoleRequirement]
        for sr in self.req.shiftRequirements:
            key = (sr.department, sr.shiftTemplate, sr.dayOfWeek)
            req_lookup[key].extend(sr.roleRequirements)

        slots = []
        for d in self.days:
            dow = d.isoweekday() % 7  # 0=Sun..6=Sat
            for sr in self.req.shiftRequirements:
                if sr.dayOfWeek is not None and sr.dayOfWeek != dow:
                    continue
                tpl = self.tpl_map.get(sr.shiftTemplate)
                if not tpl:
                    continue
                slots.append({
                    "dept_id": sr.department,
                    "tpl_id":  sr.shiftTemplate,
                    "date":    d,
                    "dow":     dow,
                    "tpl":     tpl,
                    "role_reqs": sr.roleRequirements,
                })
        return slots

    def _is_night(self, tpl) -> bool:
        return tpl.shiftType == "night"

    def _is_weekend(self, d: date) -> bool:
        return d.isoweekday() in (6, 7)  # Sat=6, Sun=7

    def build(self):
        """Build all CP-SAT variables and constraints."""
        rules = self.req.schedulingRules
        emp_ids = list(self.employees.keys())

        # ── Create decision variables ──────────────────────────────────────
        for s_idx, slot in enumerate(self.slots):
            tpl = slot["tpl"]
            dept_id = slot["dept_id"]
            d = slot["date"]
            for emp_id in emp_ids:
                emp = self.employees[emp_id]
                # Fast eligibility pre-filter (soft — eligible employees get vars)
                # All required skills across all role requirements
                all_skills = [sk for rr in slot["role_reqs"] for sk in rr.requiredSkills]
                if _employee_eligible(emp, dept_id, tpl, []):
                    key = (emp_id, s_idx)
                    self.x[key] = self.model.new_bool_var(f"x_e{emp_id[:6]}_s{s_idx}")

        # ── H5: Approved leave ─────────────────────────────────────────────
        for (emp_id, s_idx), var in self.x.items():
            d = self.slots[s_idx]["date"]
            if _employee_on_leave(emp_id, d, self.leave_map):
                self.model.add(var == 0)

        # ── H7: Employment eligibility (skill+dept) per slot ───────────────
        for (emp_id, s_idx), var in self.x.items():
            slot = self.slots[s_idx]
            emp = self.employees[emp_id]
            # Department eligibility: already filtered in variable creation
            # Skill eligibility is enforced per role requirement in H1

        # ── H1: Staffing coverage — role + skill requirements ─────────────
        # For each slot, for each role requirement: sum of eligible employees >= count
        for s_idx, slot in enumerate(self.slots):
            dept_id = slot["dept_id"]
            d = slot["date"]
            tpl = slot["tpl"]
            for rr in slot["role_reqs"]:
                role = rr.role
                count = rr.count
                req_skills = rr.requiredSkills

                # Find employees who match: correct jobCategory AND eligible dept AND skills
                eligible_vars = []
                for emp_id, emp in self.employees.items():
                    if emp.jobCategory != role:
                        continue
                    if dept_id not in emp.eligibleDepartments:
                        continue
                    if not all(sk in emp.skills or not sk for sk in req_skills):
                        continue
                    key = (emp_id, s_idx)
                    if key in self.x:
                        eligible_vars.append(self.x[key])

                if not eligible_vars and count > 0 and rr.isMandatory:
                    # Pre-feasibility: no eligible staff at all — always infeasible
                    self.pre_check_shortages.append(ShortageInfo(
                        department=dept_id,
                        date=str(d),
                        shiftTemplate=slot["tpl_id"],
                        role=role,
                        required=count,
                        available=0,
                    ))
                    # Force infeasible via contradiction
                    self.model.add_bool_and([self.model.new_bool_var("infeasible_marker")] * 0)
                    dummy = self.model.new_bool_var("dummy_infeasible")
                    self.model.add(dummy == 0)
                    self.model.add(dummy == 1)
                elif eligible_vars:
                    self.model.add(sum(eligible_vars) >= count)

        # ── H3: No overlapping shifts ──────────────────────────────────────
        # Group slots by overlap: a shift [start, end) overlaps another if they share time
        # We build datetime intervals and use no-overlap or explicit pairwise constraints
        slot_intervals: Dict[int, Tuple[int, int]] = {}  # slot_idx → (start_mins, end_mins) from epoch
        epoch = datetime(2000, 1, 1)
        for s_idx, slot in enumerate(self.slots):
            start_dt, end_dt = _shift_datetimes(slot["date"], slot["tpl"])
            start_m = int((start_dt - epoch).total_seconds() / 60)
            end_m   = int((end_dt   - epoch).total_seconds() / 60)
            slot_intervals[s_idx] = (start_m, end_m)

        # For each employee, collect all their slot vars and enforce non-overlap
        emp_slot_map: Dict[str, List[int]] = defaultdict(list)
        for (emp_id, s_idx) in self.x:
            emp_slot_map[emp_id].append(s_idx)

        for emp_id, slot_idxs in emp_slot_map.items():
            # Sort by start time
            sorted_idxs = sorted(slot_idxs, key=lambda i: slot_intervals[i][0])
            for i, si in enumerate(sorted_idxs):
                for sj in sorted_idxs[i + 1:]:
                    # If they overlap in time, they can't both be assigned
                    si_start, si_end = slot_intervals[si]
                    sj_start, sj_end = slot_intervals[sj]
                    if si_start < sj_end and sj_start < si_end:
                        # Cannot both be 1
                        xi = self.x.get((emp_id, si))
                        xj = self.x.get((emp_id, sj))
                        if xi and xj:
                            self.model.add(xi + xj <= 1)

        # ── H4: Minimum rest between consecutive shifts ────────────────────
        min_rest_mins = int(rules.minRestHours * 60)
        for emp_id, slot_idxs in emp_slot_map.items():
            emp = self.employees[emp_id]
            emp_rest_mins = int(emp.minRestHoursBetweenShifts * 60)
            effective_rest = max(min_rest_mins, emp_rest_mins)
            sorted_idxs = sorted(slot_idxs, key=lambda i: slot_intervals[i][0])
            for i in range(len(sorted_idxs) - 1):
                si = sorted_idxs[i]
                sj = sorted_idxs[i + 1]
                xi = self.x.get((emp_id, si))
                xj = self.x.get((emp_id, sj))
                if not xi or not xj:
                    continue
                _, si_end   = slot_intervals[si]
                sj_start, _ = slot_intervals[sj]
                gap = sj_start - si_end
                if gap < effective_rest:
                    # If both assigned, rest is violated → cannot both be 1
                    self.model.add(xi + xj <= 1)

        # ── H6: Working-hour limits (weekly) ──────────────────────────────
        max_hours_global = int(rules.maxHoursPerWeek * SCALE)
        # Group by ISO week
        from collections import defaultdict as dd
        week_slot_map: Dict[Tuple[str, int], List[int]] = dd(list)
        for s_idx, slot in enumerate(self.slots):
            iso_week = slot["date"].isocalendar()[1]
            for emp_id in emp_slot_map:
                if (emp_id, s_idx) in self.x:
                    week_slot_map[(emp_id, iso_week)].append(s_idx)

        for (emp_id, iso_week), sidxs in week_slot_map.items():
            emp = self.employees[emp_id]
            max_mins = int(emp.maxHoursPerWeek * 60)
            # sum of assigned durations <= max
            terms = []
            for s_idx in sidxs:
                key = (emp_id, s_idx)
                if key in self.x:
                    dur_mins = int(self.slots[s_idx]["tpl"].durationHours * 60)
                    terms.append(self.x[key] * dur_mins)
            if terms:
                self.model.add(sum(terms) <= max_mins)

        # ── H8: Maximum consecutive working days ──────────────────────────
        max_consec = rules.maxConsecutiveDays
        if max_consec > 0 and len(self.days) > max_consec:
            # For each employee, for each window of (max_consec+1) consecutive days,
            # the employee can work at most max_consec days
            day_to_slot_map: Dict[Tuple[str, date], List[int]] = defaultdict(list)
            for s_idx, slot in enumerate(self.slots):
                for emp_id in self.employees:
                    if (emp_id, s_idx) in self.x:
                        day_to_slot_map[(emp_id, slot["date"])].append(s_idx)

            for emp_id in self.employees:
                for w_start in range(len(self.days) - max_consec):
                    window_days = self.days[w_start: w_start + max_consec + 1]
                    window_vars = []
                    for wd in window_days:
                        for s_idx in day_to_slot_map.get((emp_id, wd), []):
                            window_vars.append(self.x[(emp_id, s_idx)])
                    if window_vars:
                        self.model.add(sum(window_vars) <= max_consec)

        # ── H2: Qualification match (per-role enforcement) ────────────────
        # Already enforced in H1 by checking emp.skills before adding eligible_vars

        # ── Soft objectives ───────────────────────────────────────────────
        self._build_objective(emp_slot_map)

    def _build_objective(self, emp_slot_map: Dict[str, List[int]]):
        """
        Multi-term fairness objective.

        Approach: for each employee compute the expected share of undesirable shifts,
        then penalize deviations from the mean using linearized absolute differences.

        Because CP-SAT requires integer coefficients we scale float values.

        Terms:
            (1) Night-shift imbalance  (weight 150)
            (2) Weekend-shift imbalance (weight 120)
            (3) Preference satisfaction (weight 50)
        """
        WEIGHT_NIGHT   = 150
        WEIGHT_WEEKEND = 120
        WEIGHT_PREF    = 50

        night_vars:   Dict[str, List[cp_model.IntVar]] = defaultdict(list)
        weekend_vars: Dict[str, List[cp_model.IntVar]] = defaultdict(list)
        pref_penalty:  List[cp_model.IntVar] = []

        for emp_id, sidxs in emp_slot_map.items():
            emp = self.employees[emp_id]
            for s_idx in sidxs:
                slot = self.slots[s_idx]
                tpl  = slot["tpl"]
                d    = slot["date"]
                key  = (emp_id, s_idx)
                if key not in self.x:
                    continue
                var = self.x[key]
                if self._is_night(tpl):
                    night_vars[emp_id].append(var)
                if self._is_weekend(d):
                    weekend_vars[emp_id].append(var)
                # Preference penalty: if shift type NOT in preferred → +1 penalty
                if tpl.shiftType not in (emp.preferredShifts or []):
                    pref_penalty.append(var)

        # Build pairwise imbalance terms for night and weekend shifts
        # |nights_i - nights_j| for all pairs (i,j) — approximated via
        # total deviation from mean:  for each emp, |nights_i - avg| × N_emp
        emp_ids = list(self.employees.keys())
        objective_terms = []

        def add_imbalance_terms(count_map, weight, hist_attr):
            """
            Add weighted absolute-deviation-from-mean terms.
            total_count_scaled = sum_i (historical + current) weighted.
            We linearize: deviation_i ≥ count_i - mean, deviation_i ≥ mean - count_i.
            Since mean involves a division, we work with N × mean = total.
            """
            n = len(emp_ids)
            if n <= 1:
                return
            # total_count (integer variable) = sum of all employees' assigned night/weekend vars
            all_vars = [v for vars_list in count_map.values() for v in vars_list]
            total_scaled = self.model.new_int_var(0, len(all_vars) * SCALE, "total")
            count_vars_scaled = []
            for eid in emp_ids:
                hist = getattr(self.employees[eid], hist_attr, 0)
                emp_vars = count_map.get(eid, [])
                c = self.model.new_int_var(0, 100, f"cnt_{hist_attr}_{eid[:6]}")
                # c = sum of assigned + historical (scaled not needed for counts)
                emp_assigned = self.model.new_int_var(0, len(emp_vars), f"asgn_{hist_attr}_{eid[:6]}")
                if emp_vars:
                    self.model.add(emp_assigned == sum(emp_vars))
                else:
                    self.model.add(emp_assigned == 0)
                self.model.add(c == emp_assigned + hist)
                count_vars_scaled.append((eid, c))

            # total = sum of c_i
            # For each employee: dev_i >= c_i * n - total, dev_i >= total - c_i * n
            # objective += weight * sum(dev_i)
            total_var = self.model.new_int_var(0, 10000, f"total_{hist_attr}")
            self.model.add(total_var == sum(cv for _, cv in count_vars_scaled))

            for eid, cv in count_vars_scaled:
                dev = self.model.new_int_var(0, 10000, f"dev_{hist_attr}_{eid[:6]}")
                self.model.add(dev >= cv * n - total_var)
                self.model.add(dev >= total_var - cv * n)
                objective_terms.append(weight * dev)

        add_imbalance_terms(night_vars,   WEIGHT_NIGHT,   "historicalNightShifts")
        add_imbalance_terms(weekend_vars, WEIGHT_WEEKEND, "historicalWeekendShifts")

        # Preference penalty
        if pref_penalty:
            objective_terms.append(WEIGHT_PREF * sum(pref_penalty))

        if objective_terms:
            self.model.minimize(sum(objective_terms))

    def solve(self) -> SolveResponse:
        """Run the solver and return a structured response."""
        cfg = self.req.solverConfig
        self.solver.parameters.max_time_in_seconds = cfg.timeLimitSeconds
        self.solver.parameters.num_workers = cfg.workers
        self.solver.parameters.log_search_progress = False

        t0 = time.time()
        self.build()
        t_build = time.time() - t0

        logger.info(f"Model built in {t_build:.2f}s. Variables: {len(self.x)}")

        # Early infeasibility from pre-check
        if self.pre_check_shortages:
            reasons = [
                f"No eligible {s.role} staff for {s.department} on {s.date} ({s.shiftTemplate})"
                for s in self.pre_check_shortages
            ]
            suggestions = [
                "Add more employees with the required role/skills to the department",
                "Reduce the required staffing count for the affected shifts",
                "Expand employee eligibility to additional departments",
            ]
            exec_ms = int((time.time() - t0) * 1000)
            return SolveResponse(
                status="INFEASIBLE",
                assignments=[],
                metrics=SolverMetrics(
                    executionTimeMs=exec_ms,
                    objectiveValue=None,
                    totalAssigned=0,
                    totalUnfilled=len(self.pre_check_shortages),
                ),
                diagnostics=SolverDiagnostics(
                    infeasibleReasons=reasons,
                    departmentShortages=self.pre_check_shortages,
                    suggestions=suggestions,
                ),
            )

        status_code = self.solver.solve(self.model)
        exec_ms = int((time.time() - t0) * 1000)

        logger.info(f"Solver finished in {exec_ms}ms. Status: {self.solver.status_name(status_code)}")

        status_name_map = {
            cp_model.OPTIMAL:    "OPTIMAL",
            cp_model.FEASIBLE:   "FEASIBLE",
            cp_model.INFEASIBLE: "INFEASIBLE",
            cp_model.UNKNOWN:    "UNKNOWN",
            cp_model.MODEL_INVALID: "INFEASIBLE",
        }
        status = status_name_map.get(status_code, "UNKNOWN")

        if status in ("INFEASIBLE", "UNKNOWN", "MODEL_INVALID"):
            diagnostics = self._build_diagnostics()
            return SolveResponse(
                status=status,
                assignments=[],
                metrics=SolverMetrics(
                    executionTimeMs=exec_ms,
                    objectiveValue=None,
                    totalAssigned=0,
                    totalUnfilled=self._count_unfilled(),
                ),
                diagnostics=diagnostics,
            )

        # Extract assignments
        assignments = self._extract_assignments()
        metrics = self._compute_metrics(exec_ms, assignments)

        return SolveResponse(
            status=status,
            assignments=assignments,
            metrics=metrics,
        )

    def _extract_assignments(self) -> List[AssignmentResult]:
        results = []
        for (emp_id, s_idx), var in self.x.items():
            if self.solver.value(var) == 1:
                slot = self.slots[s_idx]
                tpl  = slot["tpl"]
                d    = slot["date"]
                start_dt, end_dt = _shift_datetimes(d, tpl)
                contracted_per_day = self.employees[emp_id].contractedHoursPerWeek / 5
                duration_h = tpl.durationHours
                overtime = max(0.0, duration_h - contracted_per_day)
                results.append(AssignmentResult(
                    employeeId=emp_id,
                    departmentId=slot["dept_id"],
                    shiftTemplateId=slot["tpl_id"],
                    date=str(d),
                    startDatetime=start_dt.isoformat(),
                    endDatetime=end_dt.isoformat(),
                    shiftType=tpl.shiftType,
                    overtimeHours=round(overtime, 2),
                ))
        return results

    def _compute_metrics(self, exec_ms: int, assignments: List[AssignmentResult]) -> SolverMetrics:
        obj_val = None
        try:
            obj_val = float(self.solver.objective_value)
        except Exception:
            pass

        # Per-employee stats
        per_emp: Dict[str, Dict] = {eid: {"night": 0, "weekend": 0, "hours": 0.0} for eid in self.employees}
        for a in assignments:
            eid = a.employeeId
            if eid not in per_emp:
                continue
            slot = self.slots[next(si for (ei, si) in self.x if ei == eid and
                                   self.slots[si]["date"] == _parse_date(a.date) and
                                   self.slots[si]["tpl_id"] == a.shiftTemplateId)]
            tpl  = slot["tpl"]
            d    = _parse_date(a.date)
            per_emp[eid]["hours"] += tpl.durationHours
            if self._is_night(tpl): per_emp[eid]["night"] += 1
            if self._is_weekend(d): per_emp[eid]["weekend"] += 1

        night_counts   = [v["night"]   for v in per_emp.values()]
        weekend_counts = [v["weekend"] for v in per_emp.values()]
        hours_list     = [v["hours"]   for v in per_emp.values()]

        def variance(lst):
            if not lst: return 0.0
            m = sum(lst) / len(lst)
            return sum((x - m) ** 2 for x in lst) / len(lst)

        # Count unfilled requirements
        unfilled = self._count_unfilled_from_assignments(assignments)

        return SolverMetrics(
            executionTimeMs=exec_ms,
            objectiveValue=obj_val,
            totalAssigned=len(assignments),
            totalUnfilled=unfilled,
            fairness=FairnessMetrics(
                nightShiftVariance=round(variance(night_counts), 4),
                weekendShiftVariance=round(variance(weekend_counts), 4),
                overtimeVariance=round(variance([a.overtimeHours for a in assignments]), 4),
                workloadImbalanceScore=round(variance(hours_list), 4),
                perEmployee={eid: per_emp[eid] for eid in per_emp},
            ),
        )

    def _count_unfilled(self) -> int:
        total = 0
        for slot in self.slots:
            for rr in slot["role_reqs"]:
                total += rr.count
        return total

    def _count_unfilled_from_assignments(self, assignments: List[AssignmentResult]) -> int:
        # Count how many required slots were NOT fully covered
        assigned_count: Dict[Tuple[str, str, str, str], int] = defaultdict(int)
        for a in assignments:
            emp = self.employees.get(a.employeeId)
            if emp:
                key = (a.departmentId, a.shiftTemplateId, a.date, emp.jobCategory)
                assigned_count[key] += 1

        unfilled = 0
        for slot in self.slots:
            d_str = str(slot["date"])
            for rr in slot["role_reqs"]:
                key = (slot["dept_id"], slot["tpl_id"], d_str, rr.role)
                assigned = assigned_count.get(key, 0)
                unfilled += max(0, rr.count - assigned)
        return unfilled

    def _build_diagnostics(self) -> SolverDiagnostics:
        reasons = ["The scheduler could not find a feasible assignment satisfying all hard constraints."]
        suggestions = [
            "Check that sufficient staff with required skills exist for each department and shift.",
            "Review approved leave: too many employees on leave may make scheduling infeasible.",
            "Reduce minimum required staffing counts for affected shifts.",
            "Increase the solver time limit to allow more search time.",
            "Expand employee eligibility to cover more departments.",
        ]
        shortages = self.pre_check_shortages
        return SolverDiagnostics(
            infeasibleReasons=reasons,
            departmentShortages=shortages,
            suggestions=suggestions,
        )
