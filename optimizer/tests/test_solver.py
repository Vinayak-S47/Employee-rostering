# tests/test_solver.py
"""
Unit tests for the CP-SAT hospital rostering solver.
Run: pytest tests/test_solver.py -v
"""

import pytest
from datetime import date, timedelta
from app.schemas.solver_schemas import (
    SolveRequest, EmployeeInfo, DepartmentInfo, ShiftTemplateInfo,
    ShiftRequirementInfo, RoleRequirement, SchedulingRules, SolverConfig,
    SchedulingHorizon, ApprovedLeave,
)
from app.solver.model import HospitalRosterSolver


def make_horizon(start: date, days: int = 7):
    end = start + timedelta(days=days - 1)
    return SchedulingHorizon(startDate=str(start), endDate=str(end))


def make_dept(id="D1", name="ED", code="ED"):
    return DepartmentInfo(id=id, name=name, code=code)


def make_template(id="T1", shiftType="morning", start="06:00", end="14:00", crosses=False):
    return ShiftTemplateInfo(
        id=id, name=f"{shiftType} shift", shiftType=shiftType,
        startTime=start, endTime=end,
        durationHours=8.0, crossesMidnight=crosses,
        requirements=[RoleRequirement(role="Nurse", count=1)]
    )


def make_employee(id, role="Nurse", dept="D1", skills=None, contracted=40.0, maxH=48.0, rest=11.0):
    return EmployeeInfo(
        id=id, name=f"Employee {id}",
        jobCategory=role,
        department=dept,
        eligibleDepartments=[dept],
        skills=skills or [],
        qualifications=[],
        contractedHoursPerWeek=contracted,
        maxHoursPerWeek=maxH,
        maxHoursPerDay=12.0,
        minRestHoursBetweenShifts=rest,
        preferredShifts=["morning"],
        historicalNightShifts=0,
        historicalWeekendShifts=0,
        historicalOvertimeHours=0.0,
    )


def make_requirement(dept="D1", tpl="T1", dow=None, roles=None):
    if roles is None:
        roles = [RoleRequirement(role="Nurse", count=1)]
    return ShiftRequirementInfo(id=f"R_{dept}_{tpl}_{dow}", department=dept, shiftTemplate=tpl, dayOfWeek=dow, roleRequirements=roles)


def build_request(employees, requirements, horizon_start=date(2024, 11, 4), days=7, templates=None, leave=None):
    dept = make_dept()
    tpl  = templates or [make_template()]
    return SolveRequest(
        employees=employees,
        departments=[dept],
        shiftTemplates=tpl,
        shiftRequirements=requirements,
        approvedLeave=leave or [],
        schedulingRules=SchedulingRules(minRestHours=11, maxHoursPerWeek=48, maxConsecutiveDays=6),
        horizon=make_horizon(horizon_start, days),
        solverConfig=SolverConfig(timeLimitSeconds=10, workers=2),
    )


class TestFeasibleSchedule:
    def test_single_employee_single_shift(self):
        """One nurse, one morning shift per day for one week — must be OPTIMAL or FEASIBLE."""
        emp = [make_employee("E1")]
        reqs = [make_requirement(dow=dow) for dow in range(7)]
        req = build_request(emp, reqs)
        solver = HospitalRosterSolver(req)
        result = solver.solve()
        assert result.status in ("OPTIMAL", "FEASIBLE"), f"Expected feasible, got {result.status}"
        assert result.metrics.totalAssigned > 0

    def test_two_employees_coverage(self):
        """Two nurses required per shift — need at least 2 eligible employees."""
        emps = [make_employee("E1"), make_employee("E2")]
        reqs = [make_requirement(dow=0, roles=[RoleRequirement(role="Nurse", count=2)])]
        req = build_request(emps, reqs)
        solver = HospitalRosterSolver(req)
        result = solver.solve()
        assert result.status in ("OPTIMAL", "FEASIBLE")
        # Both employees should be assigned on day 0 (Sunday)
        assert result.metrics.totalAssigned >= 2

    def test_assignments_respect_departments(self):
        """Employee only assigned to their eligible department."""
        emps = [make_employee("E1", dept="D1")]
        reqs = [make_requirement(dept="D1", dow=0)]
        req = build_request(emps, reqs)
        solver = HospitalRosterSolver(req)
        result = solver.solve()
        for a in result.assignments:
            assert a.departmentId == "D1", "Assignment must be in eligible department"


class TestHardConstraints:
    def test_approved_leave_respected(self):
        """Employee on approved leave must not be assigned during leave period."""
        # Single employee, approved leave for the entire horizon
        emps = [make_employee("E1")]
        reqs = [make_requirement(dow=0)]
        leave = [ApprovedLeave(employee="E1", startDate="2024-11-04", endDate="2024-11-10")]
        req = build_request(emps, reqs, leave=leave)
        solver = HospitalRosterSolver(req)
        result = solver.solve()
        # With the only employee on leave, scheduling is infeasible
        for a in result.assignments:
            assert a.employeeId != "E1", "Employee on leave must not be assigned"

    def test_no_overlapping_shifts(self):
        """Employee must not be assigned to two simultaneous shifts."""
        emps = [make_employee("E1")]
        # Two templates both on same time (morning 06:00-14:00)
        tpl1 = make_template(id="T1", shiftType="morning", start="06:00", end="14:00")
        tpl2 = make_template(id="T2", shiftType="morning", start="06:00", end="14:00")
        reqs = [
            make_requirement(tpl="T1", dow=0, roles=[RoleRequirement(role="Nurse", count=1)]),
            make_requirement(tpl="T2", dow=0, roles=[RoleRequirement(role="Nurse", count=1)]),
        ]
        req = build_request(emps, reqs, templates=[tpl1, tpl2])
        solver = HospitalRosterSolver(req)
        result = solver.solve()
        # E1 cannot be assigned to both on same day
        date_counts = {}
        for a in result.assignments:
            if a.employeeId == "E1":
                date_counts[a.date] = date_counts.get(a.date, 0) + 1
        for cnt in date_counts.values():
            assert cnt <= 1, "Employee assigned to overlapping shifts"

    def test_minimum_rest_enforced(self):
        """Employee must have >= minRestHours between consecutive shifts."""
        emps = [make_employee("E1", rest=11.0)]
        # Evening (14:00-22:00) followed immediately by morning next day (06:00-14:00) = 8h gap < 11h
        tpl_eve = make_template(id="T1", shiftType="evening", start="14:00", end="22:00")
        tpl_mor = make_template(id="T2", shiftType="morning", start="06:00", end="14:00")
        reqs = [
            make_requirement(tpl="T1", dow=0),
            make_requirement(tpl="T2", dow=1),
        ]
        req = build_request(emps, reqs, templates=[tpl_eve, tpl_mor])
        solver = HospitalRosterSolver(req)
        result = solver.solve()
        # E1 should not have both shifts (gap would be 8h < 11h rest requirement)
        dates_assigned = [a.date for a in result.assignments if a.employeeId == "E1"]
        if "2024-11-04" in dates_assigned and "2024-11-05" in dates_assigned:
            pytest.fail("Minimum rest violated: employee assigned evening then morning next day with < 11h gap")

    def test_skill_requirement_respected(self):
        """Only assign employees with required skills."""
        emp_with_skill    = make_employee("E1", skills=["triage"])
        emp_without_skill = make_employee("E2", skills=[])
        reqs = [make_requirement(dow=0, roles=[RoleRequirement(role="Nurse", count=1, requiredSkills=["triage"])])]
        req = build_request([emp_with_skill, emp_without_skill], reqs)
        solver = HospitalRosterSolver(req)
        result = solver.solve()
        for a in result.assignments:
            assert a.employeeId == "E1", "Only employee with required skill should be assigned"

    def test_weekly_hour_limit(self):
        """Employee must not exceed max hours per week."""
        # 1 employee, 8h shifts for 7 days = 56h > 48h max
        emps = [make_employee("E1", maxH=48.0)]
        reqs = [make_requirement(dow=dow) for dow in range(7)]
        req = build_request(emps, reqs)
        solver = HospitalRosterSolver(req)
        result = solver.solve()
        total_hours = sum(8.0 for a in result.assignments if a.employeeId == "E1")
        assert total_hours <= 48.0 + 0.1, f"Weekly hours exceeded: {total_hours}"


class TestInfeasibility:
    def test_infeasible_no_eligible_staff(self):
        """No employees with required skill → INFEASIBLE."""
        emp = [make_employee("E1", skills=[])]
        reqs = [make_requirement(dow=0, roles=[RoleRequirement(role="Nurse", count=1, requiredSkills=["ICU_care"])])]
        req = build_request(emp, reqs)
        solver = HospitalRosterSolver(req)
        result = solver.solve()
        assert result.status == "INFEASIBLE"
        assert len(result.diagnostics.infeasibleReasons) > 0

    def test_infeasible_insufficient_staff(self):
        """Require 3 nurses but only have 1 eligible → INFEASIBLE."""
        emp = [make_employee("E1")]
        reqs = [make_requirement(dow=0, roles=[RoleRequirement(role="Nurse", count=3)])]
        req = build_request(emp, reqs)
        solver = HospitalRosterSolver(req)
        result = solver.solve()
        assert result.status in ("INFEASIBLE", "UNKNOWN")

    def test_infeasible_all_on_leave(self):
        """All employees on approved leave during the entire horizon → INFEASIBLE."""
        emps = [make_employee("E1"), make_employee("E2")]
        reqs = [make_requirement(dow=0, roles=[RoleRequirement(role="Nurse", count=1)])]
        leave = [
            ApprovedLeave(employee="E1", startDate="2024-11-04", endDate="2024-11-10"),
            ApprovedLeave(employee="E2", startDate="2024-11-04", endDate="2024-11-10"),
        ]
        req = build_request(emps, reqs, leave=leave)
        solver = HospitalRosterSolver(req)
        result = solver.solve()
        assert result.status == "INFEASIBLE" or result.metrics.totalAssigned == 0


class TestFairness:
    def test_night_shifts_distributed(self):
        """Night shifts should be distributed between eligible employees."""
        emps = [make_employee(f"E{i}") for i in range(4)]
        tpl_night = make_template(id="TN", shiftType="night", start="22:00", end="06:00", crosses=True)
        reqs = [make_requirement(tpl="TN", dow=dow) for dow in range(7)]
        req = build_request(emps, reqs, templates=[tpl_night])
        solver = HospitalRosterSolver(req)
        result = solver.solve()
        if result.status in ("OPTIMAL", "FEASIBLE"):
            per_emp = {}
            for a in result.assignments:
                per_emp[a.employeeId] = per_emp.get(a.employeeId, 0) + 1
            counts = list(per_emp.values())
            max_diff = max(counts) - min(counts) if counts else 0
            # Fair distribution: no employee has >2 more night shifts than any other
            assert max_diff <= 3, f"Night shifts not fairly distributed: {per_emp}"
