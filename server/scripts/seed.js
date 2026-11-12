// scripts/seed.js
// Seed script for demo hospital data
// Run: node scripts/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../src/models/User');
const EmployeeProfile = require('../src/models/EmployeeProfile');
const Department = require('../src/models/Department');
const ShiftTemplate = require('../src/models/ShiftTemplate');
const ShiftRequirement = require('../src/models/ShiftRequirement');
const SchedulingRule = require('../src/models/SchedulingRule');
const LeaveRequest = require('../src/models/LeaveRequest');
const Availability = require('../src/models/Availability');

const logger = console;

const DEPARTMENTS = [
  { name: 'Emergency',              code: 'ED',   color: '#dc2626', permittedRoles: ['Doctor','Nurse','Technician'], description: 'Emergency and trauma care' },
  { name: 'ICU',                    code: 'ICU',  color: '#7c3aed', permittedRoles: ['Doctor','Nurse'],              description: 'Intensive Critical Care Unit' },
  { name: 'General Ward',           code: 'GW',   color: '#0891b2', permittedRoles: ['Doctor','Nurse','Admin Staff'], description: 'General inpatient ward' },
  { name: 'Operation Theatre (OT)', code: 'OT',   color: '#059669', permittedRoles: ['Doctor','Nurse','Technician'], description: 'Surgical theatres and recovery' },
  { name: 'Pediatrics',             code: 'PED',  color: '#d97706', permittedRoles: ['Doctor','Nurse'],              description: 'Child and adolescent care' },
  { name: 'Cardiology',             code: 'CARD', color: '#e11d48', permittedRoles: ['Doctor','Nurse','Technician'], description: 'Cardiovascular diagnostics and intervention' },
  { name: 'Neurology',              code: 'NEUR', color: '#9333ea', permittedRoles: ['Doctor','Nurse','Technician'], description: 'Neurological care and stroke management' },
  { name: 'Radiology',              code: 'RAD',  color: '#0284c7', permittedRoles: ['Doctor','Technician'],         description: 'Diagnostic imaging and radiology' },
  { name: 'Laboratory',             code: 'LAB',  color: '#4f46e5', permittedRoles: ['Technician'],                 description: 'Pathology and biochemical diagnostics' },
  { name: 'Pharmacy',               code: 'PHR',  color: '#be185d', permittedRoles: ['Pharmacist'],                 description: 'Medication dispensing and pharmaceutical care' },
  { name: 'Administration',         code: 'ADM',  color: '#475569', permittedRoles: ['Admin Staff'],                 description: 'Hospital workforce and administration' },
];

const SCHEDULING_RULES = [
  { name: 'Minimum Rest Between Shifts', description: 'Minimum hours of rest required between consecutive shifts', category: 'rest', ruleKey: 'min_rest_hours', value: 11, unit: 'hours', isHardConstraint: true },
  { name: 'Maximum Hours Per Week', description: 'Maximum working hours per employee per week', category: 'hours', ruleKey: 'max_hours_per_week', value: 48, unit: 'hours', isHardConstraint: true },
  { name: 'Maximum Consecutive Working Days', description: 'Maximum consecutive days an employee can work', category: 'consecutive', ruleKey: 'max_consecutive_days', value: 6, unit: 'days', isHardConstraint: true },
  { name: 'Maximum Night Shifts Per Week', description: 'Maximum night shifts per week per employee', category: 'hours', ruleKey: 'max_night_shifts_per_week', value: 3, unit: 'shifts', isHardConstraint: false },
  { name: 'Fairness Weight - Night Shifts', description: 'Weight for night shift fairness in objective function', category: 'fairness', ruleKey: 'fairness_weight_night', value: 1.5, unit: 'weight', isHardConstraint: false },
  { name: 'Fairness Weight - Weekend Shifts', description: 'Weight for weekend shift fairness in objective function', category: 'fairness', ruleKey: 'fairness_weight_weekend', value: 1.2, unit: 'weight', isHardConstraint: false },
  { name: 'Fairness Weight - Overtime', description: 'Weight for overtime fairness in objective function', category: 'fairness', ruleKey: 'fairness_weight_overtime', value: 1.0, unit: 'weight', isHardConstraint: false },
];

const DEMO_EMPLOYEES = [
  // ── Admins / Managers ──
  { user: { firstName:'Admin',    lastName:'User',    email:'admin@hospital.com',        role:'admin',    employeeId:'EMP001' }, profile: { jobCategory:'Admin Staff', jobTitle:'System Administrator',   deptCode:'ADM' } },
  { user: { firstName:'Sarah',    lastName:'Chen',    email:'s.chen@hospital.com',       role:'manager',  employeeId:'EMP002' }, profile: { jobCategory:'Doctor',      jobTitle:'ED Department Head',     deptCode:'ED'  } },
  { user: { firstName:'Michael',  lastName:'Okafor',  email:'m.okafor@hospital.com',     role:'manager',  employeeId:'EMP003' }, profile: { jobCategory:'Nurse',       jobTitle:'ICU Nurse Manager',     deptCode:'ICU' } },
  // ── ED Doctors ──
  { user: { firstName:'Priya',    lastName:'Sharma',  email:'p.sharma@hospital.com',     role:'employee', employeeId:'EMP004' }, profile: { jobCategory:'Doctor',      jobTitle:'Emergency Physician',    deptCode:'ED',  skills:['emergency_medicine','trauma'], qualifications:['MBBS','Emergency Medicine'] } },
  { user: { firstName:'James',    lastName:'Wilson',  email:'j.wilson@hospital.com',     role:'employee', employeeId:'EMP005' }, profile: { jobCategory:'Doctor',      jobTitle:'Emergency Physician',    deptCode:'ED',  skills:['emergency_medicine','pediatric_emergency'], qualifications:['MBBS','Emergency Medicine'] } },
  // ── ED Nurses ──
  { user: { firstName:'Amara',    lastName:'Diallo',  email:'a.diallo@hospital.com',     role:'employee', employeeId:'EMP006' }, profile: { jobCategory:'Nurse',       jobTitle:'Senior Nurse',           deptCode:'ED',  skills:['triage','IV_therapy','cardiac_monitoring'], qualifications:['RN','BLS','ACLS'] } },
  { user: { firstName:'Lena',     lastName:'Mueller', email:'l.mueller@hospital.com',    role:'employee', employeeId:'EMP007' }, profile: { jobCategory:'Nurse',       jobTitle:'Nurse',                  deptCode:'ED',  skills:['triage','IV_therapy'], qualifications:['RN','BLS'] } },
  { user: { firstName:'Carlos',   lastName:'Reyes',   email:'c.reyes@hospital.com',      role:'employee', employeeId:'EMP008' }, profile: { jobCategory:'Nurse',       jobTitle:'Nurse',                  deptCode:'ED',  skills:['triage','wound_care'], qualifications:['RN','BLS'] } },
  { user: { firstName:'Fatima',   lastName:'Hassan',  email:'f.hassan@hospital.com',     role:'employee', employeeId:'EMP009' }, profile: { jobCategory:'Nurse',       jobTitle:'Nurse',                  deptCode:'ED',  skills:['triage','IV_therapy'], qualifications:['RN','BLS'] } },
  // ── ICU Nurses ──
  { user: { firstName:'Rajesh',   lastName:'Kumar',   email:'r.kumar@hospital.com',      role:'employee', employeeId:'EMP010' }, profile: { jobCategory:'Nurse',       jobTitle:'Senior ICU Nurse',       deptCode:'ICU', skills:['ICU_care','ventilator_management','cardiac_monitoring'], qualifications:['RN','BLS','ACLS','CCRN'] } },
  { user: { firstName:'Sophie',   lastName:'Blanc',   email:'s.blanc@hospital.com',      role:'employee', employeeId:'EMP011' }, profile: { jobCategory:'Nurse',       jobTitle:'ICU Nurse',              deptCode:'ICU', skills:['ICU_care','ventilator_management'], qualifications:['RN','BLS','CCRN'] } },
  { user: { firstName:'David',    lastName:'Osei',    email:'d.osei@hospital.com',       role:'employee', employeeId:'EMP012' }, profile: { jobCategory:'Nurse',       jobTitle:'ICU Nurse',              deptCode:'ICU', skills:['ICU_care','IV_therapy'], qualifications:['RN','BLS','CCRN'] } },
  { user: { firstName:'Mei',      lastName:'Zhang',   email:'m.zhang@hospital.com',      role:'employee', employeeId:'EMP013' }, profile: { jobCategory:'Nurse',       jobTitle:'ICU Nurse',              deptCode:'ICU', skills:['ICU_care','wound_care'], qualifications:['RN','BLS'] } },
  // ── ICU Doctors ──
  { user: { firstName:'Aiko',     lastName:'Tanaka',  email:'a.tanaka@hospital.com',     role:'employee', employeeId:'EMP014' }, profile: { jobCategory:'Doctor',      jobTitle:'Intensivist',            deptCode:'ICU', skills:['critical_care','ventilator_management'], qualifications:['MBBS','MD','FCICM'] } },
  // ── General Ward ──
  { user: { firstName:'Grace',    lastName:'Nwosu',   email:'g.nwosu@hospital.com',      role:'employee', employeeId:'EMP015' }, profile: { jobCategory:'Nurse',       jobTitle:'Ward Nurse',             deptCode:'GW',  skills:['general_nursing','IV_therapy'], qualifications:['RN','BLS'] } },
  { user: { firstName:'Thomas',   lastName:'Fischer', email:'t.fischer@hospital.com',    role:'employee', employeeId:'EMP016' }, profile: { jobCategory:'Nurse',       jobTitle:'Ward Nurse',             deptCode:'GW',  skills:['general_nursing','wound_care'], qualifications:['RN'] } },
  { user: { firstName:'Olivia',   lastName:'Park',    email:'o.park@hospital.com',       role:'employee', employeeId:'EMP017' }, profile: { jobCategory:'Doctor',      jobTitle:'General Physician',      deptCode:'GW',  skills:['general_medicine'], qualifications:['MBBS'] } },
  // ── Technicians / Lab / Rad / Special ──
  { user: { firstName:'Hassan',   lastName:'Al-Amin', email:'h.alamin@hospital.com',     role:'employee', employeeId:'EMP018' }, profile: { jobCategory:'Technician',  jobTitle:'Lab Technician',         deptCode:'LAB', skills:['blood_analysis','PCR','microbiology'], qualifications:['MLT'] } },
  { user: { firstName:'Ana',      lastName:'Costa',   email:'a.costa@hospital.com',      role:'employee', employeeId:'EMP019' }, profile: { jobCategory:'Technician',  jobTitle:'Radiology Technician',   deptCode:'RAD', skills:['MRI','CT_scan','X-ray'], qualifications:['DMRT'] } },
  { user: { firstName:'Nadia',    lastName:'Popova',  email:'n.popova@hospital.com',     role:'employee', employeeId:'EMP020' }, profile: { jobCategory:'Pharmacist',  jobTitle:'Clinical Pharmacist',    deptCode:'PHR', skills:['clinical_pharmacy','drug_dispensing'], qualifications:['PharmD'] } },
  { user: { firstName:'Vikram',   lastName:'Mehta',   email:'v.mehta@hospital.com',      role:'employee', employeeId:'EMP021' }, profile: { jobCategory:'Doctor',      jobTitle:'Cardiologist',           deptCode:'CARD', skills:['cardiology','echocardiogram'], qualifications:['MBBS','MD','DM'] } },
  { user: { firstName:'Elena',    lastName:'Rostova', email:'e.rostova@hospital.com',    role:'employee', employeeId:'EMP022' }, profile: { jobCategory:'Doctor',      jobTitle:'Neurologist',            deptCode:'NEUR', skills:['neurology','neuro_critical_care'], qualifications:['MBBS','MD','DM'] } },
];

async function seedData(keepConnection = false) {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
      logger.log('Connected to MongoDB');
    }

    // Clear existing data
    logger.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      EmployeeProfile.deleteMany({}),
      Department.deleteMany({}),
      ShiftTemplate.deleteMany({}),
      ShiftRequirement.deleteMany({}),
      SchedulingRule.deleteMany({}),
      LeaveRequest.deleteMany({}),
      Availability.deleteMany({}),
    ]);

    // Create departments
    logger.log('Creating departments...');
    const deptDocs = await Department.insertMany(DEPARTMENTS);
    const deptByCode = {};
    deptDocs.forEach((d) => { deptByCode[d.code] = d._id; });

    // Create scheduling rules
    logger.log('Creating scheduling rules...');
    await SchedulingRule.insertMany(SCHEDULING_RULES);

    // Create shift templates
    logger.log('Creating shift templates...');
    const shiftTemplates = await ShiftTemplate.create([
      { name: 'Morning Shift', code: 'MOR', shiftType: 'morning', startTime: '06:00', endTime: '14:00', durationHours: 8, crossesMidnight: false, color: '#f59e0b', requirements: [{ role: 'Nurse', count: 1, isMandatory: true }] },
      { name: 'Evening Shift', code: 'EVE', shiftType: 'evening', startTime: '14:00', endTime: '22:00', durationHours: 8, crossesMidnight: false, color: '#3b82f6', requirements: [{ role: 'Nurse', count: 1, isMandatory: true }] },
      { name: 'Night Shift',   code: 'NGT', shiftType: 'night',   startTime: '22:00', endTime: '06:00', durationHours: 8, crossesMidnight: true,  color: '#6d28d9', requirements: [{ role: 'Nurse', count: 1, isMandatory: true }] },
    ]);
    const tplByCode = {};
    shiftTemplates.forEach((t) => { tplByCode[t.code] = t._id; });

    // Create shift requirements
    logger.log('Creating shift requirements...');
    const reqData = [];
    for (let dow = 0; dow <= 6; dow++) {
      // ED morning
      reqData.push({ department: deptByCode['ED'], shiftTemplate: tplByCode['MOR'], dayOfWeek: dow, roleRequirements: [{ role: 'Doctor', count: 1, isMandatory: true }, { role: 'Nurse', count: 2, requiredSkills: ['triage'], isMandatory: true }] });
      reqData.push({ department: deptByCode['ED'], shiftTemplate: tplByCode['EVE'], dayOfWeek: dow, roleRequirements: [{ role: 'Doctor', count: 1, isMandatory: true }, { role: 'Nurse', count: 2, requiredSkills: ['triage'], isMandatory: true }] });
      reqData.push({ department: deptByCode['ED'], shiftTemplate: tplByCode['NGT'], dayOfWeek: dow, roleRequirements: [{ role: 'Doctor', count: 1, isMandatory: true }, { role: 'Nurse', count: 2, requiredSkills: ['triage'], isMandatory: true }] });
      // ICU: requires CCRN-qualified nurses
      reqData.push({ department: deptByCode['ICU'], shiftTemplate: tplByCode['MOR'], dayOfWeek: dow, roleRequirements: [{ role: 'Doctor', count: 1, requiredSkills: ['critical_care'], isMandatory: true }, { role: 'Nurse', count: 2, requiredSkills: ['ICU_care'], isMandatory: true }] });
      reqData.push({ department: deptByCode['ICU'], shiftTemplate: tplByCode['EVE'], dayOfWeek: dow, roleRequirements: [{ role: 'Nurse', count: 2, requiredSkills: ['ICU_care'], isMandatory: true }] });
      reqData.push({ department: deptByCode['ICU'], shiftTemplate: tplByCode['NGT'], dayOfWeek: dow, roleRequirements: [{ role: 'Nurse', count: 2, requiredSkills: ['ICU_care'], isMandatory: true }] });
      // GW
      reqData.push({ department: deptByCode['GW'], shiftTemplate: tplByCode['MOR'], dayOfWeek: dow, roleRequirements: [{ role: 'Doctor', count: 1, isMandatory: true }, { role: 'Nurse', count: 1, isMandatory: true }] });
      reqData.push({ department: deptByCode['GW'], shiftTemplate: tplByCode['EVE'], dayOfWeek: dow, roleRequirements: [{ role: 'Nurse', count: 1, isMandatory: true }] });
      reqData.push({ department: deptByCode['GW'], shiftTemplate: tplByCode['NGT'], dayOfWeek: dow, roleRequirements: [{ role: 'Nurse', count: 1, isMandatory: true }] });
    }
    await ShiftRequirement.insertMany(reqData);

    // Create users and profiles
    logger.log('Creating employees...');
    for (const emp of DEMO_EMPLOYEES) {
      const deptId = deptByCode[emp.profile.deptCode];
      const user = await User.create({
        ...emp.user,
        password: 'Hospital@2024',
        department: deptId,
        managedDepartments: emp.user.role === 'manager' ? [deptId] : [],
        isActive: true,
      });
      await EmployeeProfile.create({
        user: user._id,
        jobCategory: emp.profile.jobCategory,
        jobTitle: emp.profile.jobTitle || emp.profile.jobCategory,
        department: deptId,
        eligibleDepartments: [],
        skills: emp.profile.skills || [],
        qualifications: emp.profile.qualifications || [],
        employmentType: 'full-time',
        employmentStatus: 'active',
        contractedHoursPerWeek: 40,
        maxHoursPerWeek: 48,
        maxHoursPerDay: 12,
        minRestHoursBetweenShifts: 11,
        preferredShifts: ['morning'],
        historicalStats: {
          nightShifts: Math.floor(Math.random() * 10),
          weekendShifts: Math.floor(Math.random() * 8),
          overtimeHours: Math.floor(Math.random() * 20),
        },
      });
    }

    // Create a sample leave request
    logger.log('Creating sample leave requests...');
    const priyaUser = await User.findOne({ email: 'p.sharma@hospital.com' });
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekEnd = new Date(nextWeek);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 2);
    await LeaveRequest.create({
      employee: priyaUser._id,
      leaveType: 'annual',
      startDate: nextWeek,
      endDate: nextWeekEnd,
      reason: 'Annual vacation (seeded demo)',
      status: 'approved',
    });

    logger.log('\n✅ Seed complete!');
    logger.log('\n--- Demo Credentials ---');
    logger.log('Admin:    admin@hospital.com   / Hospital@2024');
    logger.log('Manager:  s.chen@hospital.com  / Hospital@2024');
    logger.log('Employee: p.sharma@hospital.com / Hospital@2024');
    logger.log('---\n');
  } catch (err) {
    logger.error('Seed error:', err);
    throw err;
  } finally {
    if (!keepConnection && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  seedData(false).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { seedData };
