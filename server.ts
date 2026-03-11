import express from 'express';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const railwayVolumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const databasePath =
  process.env.DATABASE_PATH ||
  process.env.DATABASE_URL ||
  (railwayVolumePath ? path.join(railwayVolumePath, 'kidneycare.db') : 'kidneycare.db');
const databaseDir = path.dirname(databasePath);

if (databaseDir && databaseDir !== '.') {
  fs.mkdirSync(databaseDir, { recursive: true });
}

const db = new Database(databasePath);
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-kidneycare-bd';

// The backend keeps schema creation colocated with the server entry point so a new
// contributor can run the project without any separate migration step.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL, -- 'patient', 'doctor', 'admin'
    division TEXT,
    district TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    age INTEGER,
    sex TEXT,
    weight REAL,
    diabetes BOOLEAN,
    hypertension BOOLEAN,
    family_history BOOLEAN,
    ckd_stage INTEGER,
    risk_score INTEGER,
    assigned_doctor_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(assigned_doctor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS vitals_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    systolic INTEGER,
    diastolic INTEGER,
    blood_sugar REAL,
    creatinine REAL,
    urine_protein TEXT,
    weight REAL,
    edema BOOLEAN,
    fatigue INTEGER,
    medications TEXT,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS gfr_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    creatinine REAL,
    age INTEGER,
    sex TEXT,
    weight REAL,
    mdrd REAL,
    cg REAL,
    ckd_epi REAL,
    stage INTEGER,
    recommendation TEXT,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    doctor_id INTEGER,
    type TEXT, -- 'CRITICAL', 'WARNING', 'REMINDER', 'MILESTONE'
    message TEXT,
    is_read BOOLEAN DEFAULT 0,
    triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(patient_id) REFERENCES patients(id),
    FOREIGN KEY(doctor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_en TEXT,
    title_bn TEXT,
    content_en TEXT,
    content_bn TEXT,
    category TEXT,
    target_stages TEXT
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Every protected route uses the same JWT middleware. The token stores only the
  // minimum user context needed by the frontend: id, role, and display name.
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // --- API Routes ---

  // Admin reporting is derived from live patient data instead of stored snapshots.
  // That keeps the reporting flow simple and guarantees exports reflect current data.
  const getAdminHeatmapData = () => db.prepare(`
    SELECT u.district as district, COUNT(*) as count, AVG(COALESCE(p.risk_score, 0)) as avg_risk
    FROM users u
    JOIN patients p ON u.id = p.user_id
    WHERE u.role = 'patient' AND u.district IS NOT NULL AND TRIM(u.district) <> ''
    GROUP BY u.district
    ORDER BY count DESC, u.district ASC
  `).all() as Array<{ district: string; count: number; avg_risk: number | null }>;

  // Policy reports are generated on demand from aggregated district-level data.
  // This makes the feature easy to demo and easy to extend without a reporting job.
  const buildPolicyReports = () => {
    const heatmap = getAdminHeatmapData();
    const totalPatients = heatmap.reduce((sum, row) => sum + row.count, 0);
    const nationalAverageRisk = heatmap.length
      ? heatmap.reduce((sum, row) => sum + (row.avg_risk ?? 0), 0) / heatmap.length
      : 0;
    const topDistricts = heatmap.slice(0, 3);
    const reportDate = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date());

    const reports = [
      {
        id: 'resource-allocation-plan',
        title: 'Resource Allocation Plan',
        desc: topDistricts.length
          ? `Prioritize dialysis and specialist capacity in ${topDistricts.map((d) => d.district).join(', ')} based on current patient concentration.`
          : 'Prioritize dialysis and specialist capacity using district-level patient concentration.',
        date: reportDate,
        filename: `KidneyCareBD_Resource_Allocation_Plan_${new Date().toISOString().split('T')[0]}.md`,
        content: [
          '# Resource Allocation Plan',
          '',
          `Report date: ${reportDate}`,
          `Total tracked patients: ${totalPatients}`,
          `Average national risk score: ${nationalAverageRisk.toFixed(1)}`,
          '',
          '## Recommended high-priority districts',
          ...(topDistricts.length
            ? topDistricts.map((district, index) => `${index + 1}. ${district.district}: ${district.count} patients, avg risk ${Math.round(district.avg_risk ?? 0)}`)
            : ['No district-level patient data available yet.']),
          '',
          '## Recommended actions',
          '1. Expand screening and nephrology referral capacity in the highest-burden districts.',
          '2. Prioritize medicine stock and dialysis support where average risk remains elevated.',
          '3. Reassess district allocations monthly as new patient and vitals data arrive.',
        ].join('\n'),
      },
      {
        id: 'rural-screening-initiative',
        title: 'Rural Screening Initiative',
        desc: heatmap.length
          ? `Deploy mobile screening in non-metro districts with elevated risk, starting with ${heatmap.filter((d) => !['Dhaka', 'Chittagong'].includes(d.district)).slice(0, 3).map((d) => d.district).join(', ') || 'priority rural districts'}.`
          : 'Deploy mobile screening in non-metro districts with elevated risk.',
        date: reportDate,
        filename: `KidneyCareBD_Rural_Screening_Initiative_${new Date().toISOString().split('T')[0]}.md`,
        content: [
          '# Rural Screening Initiative',
          '',
          `Report date: ${reportDate}`,
          '',
          '## Rationale',
          'Rural patients often present later in the disease course and have weaker follow-up continuity.',
          '',
          '## Suggested focus areas',
          ...(heatmap.filter((d) => !['Dhaka', 'Chittagong'].includes(d.district)).slice(0, 5).map((district, index) =>
            `${index + 1}. ${district.district}: ${district.count} tracked patients, avg risk ${Math.round(district.avg_risk ?? 0)}`
          ) || ['1. No rural district data available yet.']),
          '',
          '## Operational recommendations',
          '1. Schedule rotating mobile creatinine and blood pressure screening camps.',
          '2. Pair each camp with referral routing to the nearest nephrology-capable center.',
          '3. Track conversion from screening to follow-up visit as a monthly KPI.',
        ].join('\n'),
      },
      {
        id: 'medication-subsidy-impact',
        title: 'Medication Subsidy Impact',
        desc: `Review high-risk patient burden against current subsidy coverage assumptions using ${totalPatients} tracked patient records.`,
        date: reportDate,
        filename: `KidneyCareBD_Medication_Subsidy_Impact_${new Date().toISOString().split('T')[0]}.md`,
        content: [
          '# Medication Subsidy Impact',
          '',
          `Report date: ${reportDate}`,
          `Tracked patient records used: ${totalPatients}`,
          '',
          '## Observations',
          `National average risk score across districts is ${nationalAverageRisk.toFixed(1)}.`,
          'Higher-risk districts should be prioritized for antihypertensive, diabetes, and renal-protective medication support.',
          '',
          '## Recommended actions',
          '1. Link subsidy eligibility to risk score and CKD stage progression.',
          '2. Monitor refill adherence alongside vitals deterioration.',
          '3. Re-run the subsidy impact review after each monthly data refresh.',
        ].join('\n'),
      },
    ];

    return reports;
  };

  // Seed records make the application presentation-ready after the first startup.
  // This is useful for demos, grading, and contributor onboarding.
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  if (userCount.count === 0) {
    console.log('Database empty, seeding initial data...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Admin & Doctor
    db.prepare('INSERT INTO users (name, email, password, role, district) VALUES (?, ?, ?, ?, ?)').run('Admin Officer', 'admin@kidneycare.bd', hashedPassword, 'admin', 'Dhaka');
    db.prepare('INSERT INTO users (name, email, password, role, district) VALUES (?, ?, ?, ?, ?)').run('Dr. Ahmed Khan', 'doctor@kidneycare.bd', hashedPassword, 'doctor', 'Dhaka');
    
    // Demo Patients in different districts
    const districts = ['Dhaka', 'Chittagong', 'Gazipur', 'Narayanganj', 'Rajshahi', 'Sylhet', 'Khulna', 'Barisal'];
    districts.forEach((dist, i) => {
      const p = db.prepare('INSERT INTO users (name, email, password, role, district) VALUES (?, ?, ?, ?, ?)').run(`Patient ${dist}`, `patient_${dist.toLowerCase()}@kidneycare.bd`, hashedPassword, 'patient', dist);
      // Assign even-indexed patients to Dr. Ahmed Khan (id: 2)
      const doctorId = i % 2 === 0 ? 2 : null;
      db.prepare('INSERT INTO patients (user_id, age, sex, weight, diabetes, hypertension, risk_score, ckd_stage, assigned_doctor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(p.lastInsertRowid, 40 + i * 5, i % 2 === 0 ? 'male' : 'female', 60 + i * 2, i % 3 === 0 ? 1 : 0, 1, 20 + i * 10, (i % 4) + 1, doctorId);
    });

    // Articles
    const articles = [
      {
        en: 'Understanding CKD Stages',
        bn: 'à¦¸à¦¿à¦•à§‡à¦¡à¦¿ à¦ªà¦°à§à¦¯à¦¾à¦¯à¦¼à¦—à§à¦²à¦¿ à¦¬à§‹à¦à¦¾',
        cat: 'Basics',
        content_en: 'Chronic Kidney Disease (CKD) is divided into 5 stages based on your GFR score. Stage 1 is mild, while Stage 5 means kidney failure. Monitoring your GFR is crucial for early detection.',
        content_bn: 'à¦•à§à¦°à¦¨à¦¿à¦• à¦•à¦¿à¦¡à¦¨à¦¿ à¦¡à¦¿à¦œà¦¿à¦œ (à¦¸à¦¿à¦•à§‡à¦¡à¦¿) à¦†à¦ªà¦¨à¦¾à¦° à¦œà¦¿à¦à¦«à¦†à¦° à¦¸à§à¦•à§‹à¦°à§‡à¦° à¦‰à¦ªà¦° à¦­à¦¿à¦¤à§à¦¤à¦¿ à¦•à¦°à§‡ à§«à¦Ÿà¦¿ à¦ªà¦°à§à¦¯à¦¾à¦¯à¦¼à§‡ à¦¬à¦¿à¦­à¦•à§à¦¤à¥¤ à¦ªà¦°à§à¦¯à¦¾à¦¯à¦¼ à§§ à¦®à§ƒà¦¦à§, à¦†à¦° à¦ªà¦°à§à¦¯à¦¾à¦¯à¦¼ à§« à¦®à¦¾à¦¨à§‡ à¦•à¦¿à¦¡à¦¨à¦¿ à¦¬à¦¿à¦•à¦² à¦¹à¦“à¦¯à¦¼à¦¾à¥¤ à¦ªà§à¦°à¦¾à¦¥à¦®à¦¿à¦• à¦¸à¦¨à¦¾à¦•à§à¦¤à¦•à¦°à¦£à§‡à¦° à¦œà¦¨à§à¦¯ à¦†à¦ªà¦¨à¦¾à¦° à¦œà¦¿à¦à¦«à¦†à¦° à¦ªà¦°à§à¦¯à¦¬à§‡à¦•à§à¦·à¦£ à¦•à¦°à¦¾ à¦…à¦¤à§à¦¯à¦¨à§à¦¤ à¦—à§à¦°à§à¦¤à§à¦¬à¦ªà§‚à¦°à§à¦£à¥¤'
      },
      {
        en: 'Diet Tips for Kidney Health',
        bn: 'à¦•à¦¿à¦¡à¦¨à¦¿ à¦¸à§à¦¬à¦¾à¦¸à§à¦¥à§à¦¯à§‡à¦° à¦œà¦¨à§à¦¯ à¦¡à¦¾à¦¯à¦¼à§‡à¦Ÿ à¦Ÿà¦¿à¦ªà¦¸',
        cat: 'Diet',
        content_en: 'A kidney-friendly diet involves low sodium, low potassium, and controlled protein intake. Focus on fresh vegetables like cauliflower and fruits like apples. Avoid processed foods.',
        content_bn: 'à¦•à¦¿à¦¡à¦¨à¦¿-à¦¬à¦¾à¦¨à§à¦§à¦¬ à¦¡à¦¾à¦¯à¦¼à§‡à¦Ÿà§‡ à¦•à¦® à¦¸à§‹à¦¡à¦¿à¦¯à¦¼à¦¾à¦®, à¦•à¦® à¦ªà¦Ÿà¦¾à¦¶à¦¿à¦¯à¦¼à¦¾à¦® à¦à¦¬à¦‚ à¦¨à¦¿à¦¯à¦¼à¦¨à§à¦¤à§à¦°à¦¿à¦¤ à¦ªà§à¦°à§‹à¦Ÿà¦¿à¦¨ à¦—à§à¦°à¦¹à¦£ à¦…à¦¨à§à¦¤à¦°à§à¦­à§à¦•à§à¦¤à¥¤ à¦«à§à¦²à¦•à¦ªà¦¿à¦° à¦®à¦¤à§‹ à¦¤à¦¾à¦œà¦¾ à¦¶à¦¾à¦•à¦¸à¦¬à¦œà¦¿ à¦à¦¬à¦‚ à¦†à¦ªà§‡à¦²à§‡à¦° à¦®à¦¤à§‹ à¦«à¦²à§‡à¦° à¦¦à¦¿à¦•à§‡ à¦®à¦¨à§‹à¦¨à¦¿à¦¬à§‡à¦¶ à¦•à¦°à§à¦¨à¥¤ à¦ªà§à¦°à¦•à§à¦°à¦¿à¦¯à¦¼à¦¾à¦œà¦¾à¦¤ à¦–à¦¾à¦¬à¦¾à¦° à¦à¦¡à¦¼à¦¿à¦¯à¦¼à§‡ à¦šà¦²à§à¦¨à¥¤'
      },
      {
        en: 'Managing Hypertension',
        bn: 'à¦‰à¦šà§à¦š à¦°à¦•à§à¦¤à¦šà¦¾à¦ª à¦¬à§à¦¯à¦¬à¦¸à§à¦¥à¦¾à¦ªà¦¨à¦¾',
        cat: 'Management',
        content_en: 'High blood pressure is a leading cause of CKD. Maintain a healthy weight, exercise regularly, and take prescribed medications to protect your kidneys.',
        content_bn: 'à¦‰à¦šà§à¦š à¦°à¦•à§à¦¤à¦šà¦¾à¦ª à¦¸à¦¿à¦•à§‡à¦¡à¦¿à¦° à¦à¦•à¦Ÿà¦¿ à¦ªà§à¦°à¦§à¦¾à¦¨ à¦•à¦¾à¦°à¦£à¥¤ à¦†à¦ªà¦¨à¦¾à¦° à¦•à¦¿à¦¡à¦¨à¦¿ à¦°à¦•à§à¦·à¦¾ à¦•à¦°à¦¾à¦° à¦œà¦¨à§à¦¯ à¦¸à§à¦¬à¦¾à¦¸à§à¦¥à§à¦¯à¦•à¦° à¦“à¦œà¦¨ à¦¬à¦œà¦¾à¦¯à¦¼ à¦°à¦¾à¦–à§à¦¨, à¦¨à¦¿à¦¯à¦¼à¦®à¦¿à¦¤ à¦¬à§à¦¯à¦¾à¦¯à¦¼à¦¾à¦® à¦•à¦°à§à¦¨ à¦à¦¬à¦‚ à¦¨à¦¿à¦°à§à¦§à¦¾à¦°à¦¿à¦¤ à¦“à¦·à§à¦§ à¦¸à§‡à¦¬à¦¨ à¦•à¦°à§à¦¨à¥¤'
      },
      {
        en: 'Diabetes and Kidney Disease',
        bn: 'à¦¡à¦¾à¦¯à¦¼à¦¾à¦¬à§‡à¦Ÿà¦¿à¦¸ à¦à¦¬à¦‚ à¦•à¦¿à¦¡à¦¨à¦¿ à¦°à§‹à¦—',
        cat: 'Management',
        content_en: 'Uncontrolled diabetes can damage the small blood vessels in your kidneys. Keep your blood sugar levels within target range to prevent CKD progression.',
        content_bn: 'à¦…à¦¨à¦¿à¦¯à¦¼à¦¨à§à¦¤à§à¦°à¦¿à¦¤ à¦¡à¦¾à¦¯à¦¼à¦¾à¦¬à§‡à¦Ÿà¦¿à¦¸ à¦†à¦ªà¦¨à¦¾à¦° à¦•à¦¿à¦¡à¦¨à¦¿à¦° à¦›à§‹à¦Ÿ à¦°à¦•à§à¦¤à¦¨à¦¾à¦²à§€à¦—à§à¦²à¦¿à¦•à§‡ à¦•à§à¦·à¦¤à¦¿à¦—à§à¦°à¦¸à§à¦¤ à¦•à¦°à¦¤à§‡ à¦ªà¦¾à¦°à§‡à¥¤ à¦¸à¦¿à¦•à§‡à¦¡à¦¿à¦° à¦…à¦—à§à¦°à¦—à¦¤à¦¿ à¦°à§‹à¦§ à¦•à¦°à¦¤à§‡ à¦†à¦ªà¦¨à¦¾à¦° à¦°à¦•à§à¦¤à§‡à¦° à¦¶à¦°à§à¦•à¦°à¦¾à¦° à¦®à¦¾à¦¤à§à¦°à¦¾ à¦²à¦•à§à¦·à§à¦¯à§‡à¦° à¦®à¦§à§à¦¯à§‡ à¦°à¦¾à¦–à§à¦¨à¥¤'
      },
      {
        en: 'Dialysis and Transplantation',
        bn: 'à¦¡à¦¾à¦¯à¦¼à¦¾à¦²à¦¾à¦‡à¦¸à¦¿à¦¸ à¦à¦¬à¦‚ à¦ªà§à¦°à¦¤à¦¿à¦¸à§à¦¥à¦¾à¦ªà¦¨',
        cat: 'Treatment',
        content_en: 'When kidneys reach Stage 5 (failure), treatments like hemodialysis or a kidney transplant are necessary. Hemodialysis filters blood using a machine, while a transplant involves a surgical procedure to replace the failed kidney with a healthy one.',
        content_bn: 'à¦¯à¦–à¦¨ à¦•à¦¿à¦¡à¦¨à¦¿ à¦ªà¦°à§à¦¯à¦¾à¦¯à¦¼ à§«-à¦ (à¦¬à¦¿à¦•à¦²) à¦ªà§Œà¦à¦›à¦¾à¦¯à¦¼, à¦¤à¦–à¦¨ à¦¹à§‡à¦®à§‹à¦¡à¦¾à¦¯à¦¼à¦¾à¦²à¦¾à¦‡à¦¸à¦¿à¦¸ à¦¬à¦¾ à¦•à¦¿à¦¡à¦¨à¦¿ à¦ªà§à¦°à¦¤à¦¿à¦¸à§à¦¥à¦¾à¦ªà¦¨à§‡à¦° à¦®à¦¤à§‹ à¦šà¦¿à¦•à¦¿à§Žà¦¸à¦¾à¦° à¦ªà§à¦°à¦¯à¦¼à§‹à¦œà¦¨ à¦¹à¦¯à¦¼à¥¤ à¦¹à§‡à¦®à§‹à¦¡à¦¾à¦¯à¦¼à¦¾à¦²à¦¾à¦‡à¦¸à¦¿à¦¸ à¦à¦•à¦Ÿà¦¿ à¦®à§‡à¦¶à¦¿à¦¨à§‡à¦° à¦¸à¦¾à¦¹à¦¾à¦¯à§à¦¯à§‡ à¦°à¦•à§à¦¤ à¦«à¦¿à¦²à§à¦Ÿà¦¾à¦° à¦•à¦°à§‡, à¦†à¦° à¦ªà§à¦°à¦¤à¦¿à¦¸à§à¦¥à¦¾à¦ªà¦¨à§‡ à¦¬à¦¿à¦•à¦² à¦•à¦¿à¦¡à¦¨à¦¿à¦Ÿà¦¿ à¦à¦•à¦Ÿà¦¿ à¦¸à§à¦¸à§à¦¥ à¦•à¦¿à¦¡à¦¨à¦¿ à¦¦à¦¿à¦¯à¦¼à§‡ à¦ªà§à¦°à¦¤à¦¿à¦¸à§à¦¥à¦¾à¦ªà¦¨ à¦•à¦°à¦¾à¦° à¦œà¦¨à§à¦¯ à¦…à¦¸à§à¦¤à§à¦°à§‹à¦ªà¦šà¦¾à¦° à¦•à¦°à¦¾ à¦¹à¦¯à¦¼à¥¤'
      }
    ];

    const insertArt = db.prepare('INSERT INTO articles (title_en, title_bn, content_en, content_bn, category) VALUES (?, ?, ?, ?, ?)');
    articles.forEach(a => insertArt.run(a.en, a.bn, a.content_en, a.content_bn, a.cat));
    
    console.log('Seeding complete.');
  }

  // Auth
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role, division, district } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const result = db.prepare('INSERT INTO users (name, email, password, role, division, district) VALUES (?, ?, ?, ?, ?, ?)').run(name, email, hashedPassword, role, division, district);
      const userId = result.lastInsertRowid;
      
      // Only patient registrations need a paired row in the patients table.
      if (role === 'patient') {
        db.prepare('INSERT INTO patients (user_id) VALUES (?)').run(userId);
      }
      
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      res.status(400).json({ error: 'Email already exists' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  });

  // Patient Profile
  app.get('/api/patient/profile', authenticateToken, (req: any, res) => {
    const patient = db.prepare(`
      SELECT u.*, p.* 
      FROM users u 
      JOIN patients p ON u.id = p.user_id 
      WHERE u.id = ?
    `).get(req.user.id);
    res.json(patient);
  });

  app.put('/api/patient/profile', authenticateToken, (req: any, res) => {
    const { age, sex, weight, diabetes, hypertension, family_history } = req.body;
    db.prepare(`
      UPDATE patients 
      SET age = ?, sex = ?, weight = ?, diabetes = ?, hypertension = ?, family_history = ? 
      WHERE user_id = ?
    `).run(age, sex, weight, diabetes ? 1 : 0, hypertension ? 1 : 0, family_history ? 1 : 0, req.user.id);
    
    // Recalculate risk score
    const patient = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(req.user.id) as any;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
    let score = 0;
    if (patient.age > 60) score += 35;
    else if (patient.age > 40) score += 20;
    if (patient.sex === 'female') score += 10;
    if (patient.diabetes) score += 25;
    if (patient.hypertension) score += 20;
    if (patient.family_history) score += 15;
    if (user.district && !['Dhaka', 'Chittagong'].includes(user.district)) score += 5;
    db.prepare('UPDATE patients SET risk_score = ? WHERE user_id = ?').run(score, req.user.id);

    res.json({ message: 'Profile updated' });
  });

  // Vitals
  app.post('/api/patient/vitals', authenticateToken, (req: any, res) => {
    const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id) as any;
    const { systolic, diastolic, blood_sugar, creatinine, urine_protein, weight, edema, fatigue, medications } = req.body;
    db.prepare(`
      INSERT INTO vitals_log (patient_id, systolic, diastolic, blood_sugar, creatinine, urine_protein, weight, edema, fatigue, medications)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(patient.id, systolic, diastolic, blood_sugar, creatinine, urine_protein, weight, edema ? 1 : 0, fatigue, medications);
    
    // Trigger Risk Engine & Alerts (Simplified)
    checkAlerts(patient.id);
    
    res.json({ message: 'Vitals logged' });
  });

  app.get('/api/patient/vitals', authenticateToken, (req: any, res) => {
    const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id) as any;
    const logs = db.prepare('SELECT * FROM vitals_log WHERE patient_id = ? ORDER BY date DESC').all(patient.id);
    res.json(logs);
  });

  // GFR Calculator Logic
  app.post('/api/patient/gfr', authenticateToken, (req: any, res) => {
    const { creatinine, age, sex, weight } = req.body;
    const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id) as any;

    // MDRD = 175 Ã— (Creatinine)^-1.154 Ã— (Age)^-0.203 Ã— 0.742 (if female)
    let mdrd = 175 * Math.pow(creatinine, -1.154) * Math.pow(age, -0.203);
    if (sex === 'female') mdrd *= 0.742;

    // CG = [(140-age) Ã— weight] / (72 Ã— creatinine) Ã— 0.85 (if female)
    let cg = ((140 - age) * weight) / (72 * creatinine);
    if (sex === 'female') cg *= 0.85;

    // CKD-EPI (Simplified version)
    let ckdEpi = 0;
    const k = sex === 'female' ? 0.7 : 0.9;
    const a = sex === 'female' ? -0.329 : -0.411;
    ckdEpi = 141 * Math.pow(Math.min(creatinine / k, 1), a) * Math.pow(Math.max(creatinine / k, 1), -1.209) * Math.pow(0.993, age);
    if (sex === 'female') ckdEpi *= 1.018;

    const avgGfr = (mdrd + cg + ckdEpi) / 3;
    let stage = 1;
    if (avgGfr < 15) stage = 5;
    else if (avgGfr < 30) stage = 4;
    else if (avgGfr < 60) stage = 3;
    else if (avgGfr < 90) stage = 2;

    const recommendation = stage >= 4 ? 'Urgent Care Required' : (stage === 3 ? 'Refer to Nephrologist' : 'Monitor');

    db.prepare(`
      INSERT INTO gfr_records (patient_id, creatinine, age, sex, weight, mdrd, cg, ckd_epi, stage, recommendation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(patient.id, creatinine, age, sex, weight, mdrd, cg, ckdEpi, stage, recommendation);

    res.json({ mdrd, cg, ckdEpi, stage, recommendation });
  });

  app.get('/api/patient/gfr-history', authenticateToken, (req: any, res) => {
    const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id) as any;
    const history = db.prepare('SELECT * FROM gfr_records WHERE patient_id = ? ORDER BY date ASC').all(patient.id);
    res.json(history);
  });

  // Risk Engine
  app.get('/api/patient/risk-score', authenticateToken, (req: any, res) => {
    const patient = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(req.user.id) as any;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
    
    let score = 0;
    if (patient.age > 60) score += 35;
    else if (patient.age > 40) score += 20;
    
    if (patient.sex === 'female') score += 10;
    if (patient.diabetes) score += 25;
    if (patient.hypertension) score += 20;
    if (patient.family_history) score += 15;
    // The district rule is a simplified rural proxy for the current prototype.
    if (user.district && !['Dhaka', 'Chittagong'].includes(user.district)) score += 5;

    db.prepare('UPDATE patients SET risk_score = ? WHERE user_id = ?').run(score, req.user.id);
    res.json({ score });
  });

  // Doctor Routes
  app.get('/api/doctor/patients', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'doctor') return res.sendStatus(403);
    const { assignedOnly } = req.query;
    let query = `
      SELECT u.name, u.email, u.district, p.* 
      FROM users u 
      JOIN patients p ON u.id = p.user_id
    `;
    const params: any[] = [];
    
    if (assignedOnly === 'true') {
      query += ' WHERE p.assigned_doctor_id = ?';
      params.push(req.user.id);
    }

    const patients = db.prepare(query).all(...params);
    res.json(patients);
  });

  app.get('/api/doctor/patient/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'doctor') return res.sendStatus(403);
    const patient = db.prepare(`
      SELECT u.name, u.email, u.division, u.district, p.* 
      FROM users u 
      JOIN patients p ON u.id = p.user_id 
      WHERE p.id = ?
    `).get(req.params.id);
    const vitals = db.prepare('SELECT * FROM vitals_log WHERE patient_id = ? ORDER BY date DESC').all(req.params.id);
    const gfr = db.prepare('SELECT * FROM gfr_records WHERE patient_id = ? ORDER BY date DESC').all(req.params.id);
    res.json({ patient, vitals, gfr });
  });

  app.get('/api/doctor/alerts', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'doctor') return res.sendStatus(403);
    const alerts = db.prepare(`
      SELECT a.*, u.name as patient_name 
      FROM alerts a 
      JOIN patients p ON a.patient_id = p.id 
      JOIN users u ON p.user_id = u.id 
      ORDER BY triggered_at DESC
    `).all();
    res.json(alerts);
  });

  app.post('/api/doctor/alerts/read', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'doctor') return res.sendStatus(403);
    const { alertId } = req.body;
    if (alertId) {
      db.prepare('UPDATE alerts SET is_read = 1 WHERE id = ?').run(alertId);
    } else {
      db.prepare('UPDATE alerts SET is_read = 1').run();
    }
    res.json({ message: 'Alerts marked as read' });
  });

  // Admin Routes
  app.get('/api/admin/heatmap', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    res.json(getAdminHeatmapData());
  });

  app.get('/api/admin/export-research-data', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    
    // Export a denormalized dataset so the result can be opened directly in spreadsheet
    // tools or used for external research analysis without extra joins.
    const data = db.prepare(`
      SELECT 
        u.id as user_id, u.name, u.email, u.division, u.district,
        p.age, p.sex, p.weight as baseline_weight, p.diabetes, p.hypertension, p.family_history, p.ckd_stage, p.risk_score,
        v.systolic, v.diastolic, v.blood_sugar, v.creatinine as latest_creatinine, v.urine_protein, v.edema, v.fatigue,
        g.mdrd, g.cg, g.ckd_epi
      FROM users u
      JOIN patients p ON u.id = p.user_id
      LEFT JOIN (
        SELECT * FROM vitals_log WHERE id IN (SELECT MAX(id) FROM vitals_log GROUP BY patient_id)
      ) v ON p.id = v.patient_id
      LEFT JOIN (
        SELECT * FROM gfr_records WHERE id IN (SELECT MAX(id) FROM gfr_records GROUP BY patient_id)
      ) g ON p.id = g.patient_id
      WHERE u.role = 'patient'
    `).all();

    res.json(data);
  });

  app.get('/api/admin/reports', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    res.json(buildPolicyReports());
  });

  app.get('/api/admin/export-national-report', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);

    const heatmap = getAdminHeatmapData();
    const totalPatients = heatmap.reduce((sum, row) => sum + row.count, 0);
    const averageRisk = heatmap.length
      ? heatmap.reduce((sum, row) => sum + (row.avg_risk ?? 0), 0) / heatmap.length
      : 0;

    const content = [
      '# KidneyCare BD National CKD Burden Report',
      '',
      `Generated on: ${new Date().toISOString()}`,
      `Total tracked patients: ${totalPatients}`,
      `Districts represented: ${heatmap.length}`,
      `Average district risk score: ${averageRisk.toFixed(1)}`,
      '',
      '## District summary',
      ...(heatmap.length
        ? heatmap.map((district, index) => `${index + 1}. ${district.district}: ${district.count} patients, avg risk ${Math.round(district.avg_risk ?? 0)}`)
        : ['No patient data available.']),
      '',
      '## Policy priorities',
      '1. Expand screening in the highest-burden districts.',
      '2. Improve follow-up capacity for districts with elevated average risk.',
      '3. Use monthly exports to compare district trend movement over time.',
    ].join('\n');

    res.json({
      filename: `KidneyCareBD_National_CKD_Burden_Report_${new Date().toISOString().split('T')[0]}.md`,
      content,
    });
  });

  // Education Hub
  app.get('/api/articles', (req, res) => {
    const articles = db.prepare('SELECT * FROM articles').all();
    res.json(articles);
  });

  // Alerts are currently generated from recent vitals only. This is intentionally
  // simple so contributors can replace it with more advanced clinical rules later.
  function checkAlerts(patientId: number) {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId) as any;
    const latestVitals = db.prepare('SELECT * FROM vitals_log WHERE patient_id = ? ORDER BY date DESC LIMIT 2').all(patientId) as any[];
    
    if (latestVitals.length >= 1) {
      const v = latestVitals[0];
      if (v.systolic > 140 || v.diastolic > 90) {
        db.prepare('INSERT INTO alerts (patient_id, type, message) VALUES (?, ?, ?)').run(patientId, 'WARNING', 'High blood pressure detected consistently.');
      }
    }
  }

  // In development the Express server hosts Vite in middleware mode, so contributors
  // only need one process. In production the same server serves the built SPA.
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Using database at: ${databasePath}`);
  });
}

startServer();
