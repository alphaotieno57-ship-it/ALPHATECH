const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'));
const DATA_FILE = path.join(DATA_DIR, 'portal-data.json');
const MAX_JSON_BYTES = process.env.MAX_JSON_BYTES || '20mb';
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: MAX_JSON_BYTES }));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));

const emptyDB = {
  students: [], notes: [], assignments: [], assessments: [], records: [], payments: [], feeEntries: [],
  unitBookings: [], unitResources: [], unitResults: [], practicumApplications: [], graduationApplications: [],
  certificates: [], enrollmentKeys: [], auditLogs: [], academicTerms: [], programmes: [], academicCalendar: [],
  generatedTimetables: [], academicMilestones: [], staff: [], libraryItems: [], messages: [], supportTickets: [],
  lessonPlans: [], assignmentSubmissions: [], tutorAnnouncements: [], systemSettings: [], backupLog: []
};
function readDB() {
  try { return { ...emptyDB, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) }; }
  catch (err) {
    if (err.code !== 'ENOENT') console.error('Could not read portal data:', err.message);
    return { ...emptyDB };
  }
}
function writeDB(data) {
  const temp = DATA_FILE + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(temp, DATA_FILE);
}

// IMPORTANT: These API routes must be placed behind an authenticated access layer
// (e.g. Cloudflare Access, an authenticated reverse proxy, or a proper login/session
// implementation) before storing real student, payment, or identity information.
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Amazing Scholar Portal API' }));
app.get('/api/data', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(readDB());
});
app.put('/api/data', (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Expected a JSON object containing portal data.' });
  }
  try { writeDB({ ...emptyDB, ...req.body }); res.json({ ok: true, savedAt: new Date().toISOString() }); }
  catch (err) { console.error('Data save failed:', err); res.status(500).json({ error: 'Could not save portal data.' }); }
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').slice(0, 12).replace(/[^.a-zA-Z0-9]/g, '');
    cb(null, Date.now() + '-' + crypto.randomBytes(8).toString('hex') + ext);
  }
});
const allowedExt = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.zip', '.txt', '.csv', '.png', '.jpg', '.jpeg', '.webp']);
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!allowedExt.has(ext)) return cb(new Error('File type is not allowed.'));
    cb(null, true);
  }
});
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a file to upload.' });
  res.status(201).json({
    name: path.basename(req.file.originalname),
    url: '/uploads/' + encodeURIComponent(req.file.filename),
    size: req.file.size,
    mimeType: req.file.mimetype
  });
});
app.use('/uploads', express.static(UPLOAD_DIR, { fallthrough: false, maxAge: '1h', dotfiles: 'deny' }));

function makeMailer() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}
app.post('/api/email-certificate', async (req, res) => {
  const { certificateNumber, admission, email, studentName, course, issuedAt } = req.body || {};
  if (![certificateNumber, admission, email, studentName, course].every(v => typeof v === 'string' && v.trim())) {
    return res.status(400).json({ error: 'Certificate number, admission, email, student name and course are required.' });
  }
  const transporter = makeMailer();
  if (!transporter) return res.status(503).json({ error: 'SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.' });
  try {
    const pdf = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 55 });
    const chunks = [];
    pdf.on('data', chunk => chunks.push(chunk));
    const finished = new Promise((resolve, reject) => { pdf.on('end', resolve); pdf.on('error', reject); });
    pdf.rect(24, 24, 794, 545).lineWidth(5).stroke('#174b3b');
    pdf.rect(34, 34, 774, 525).lineWidth(1).stroke('#c90022');
    pdf.moveDown(2).font('Times-Bold').fontSize(24).fillColor('#087b52').text('AMAZING SCHOLAR COMPUTER SCHOOL', { align: 'center' });
    pdf.moveDown(1).fontSize(30).fillColor('#243447').text('CERTIFICATE OF ACHIEVEMENT', { align: 'center' });
    pdf.moveDown(1.2).font('Times-Roman').fontSize(17).text('This is to certify that', { align: 'center' });
    pdf.moveDown(0.5).font('Times-Bold').fontSize(32).fillColor('#c90022').text(studentName, { align: 'center' });
    pdf.moveDown(0.7).font('Times-Roman').fontSize(17).fillColor('#243447').text('has successfully completed', { align: 'center' });
    pdf.moveDown(0.5).font('Times-Bold').fontSize(23).fillColor('#087b52').text(course, { align: 'center' });
    pdf.moveDown(1).font('Times-Roman').fontSize(12).fillColor('#243447').text('Certificate Number: ' + certificateNumber + '     Admission: ' + admission, { align: 'center' });
    pdf.text('Date issued: ' + String(issuedAt || new Date().toISOString()).slice(0, 10), { align: 'center' });
    pdf.end();
    await finished;
    const attachment = Buffer.concat(chunks);
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Your Amazing Scholar Computer School certificate',
      text: `Dear ${studentName},\n\nCongratulations. Your certificate for ${course} is attached.\nCertificate number: ${certificateNumber}\n\nRegards,\nAmazing Scholar Computer School`,
      attachments: [{ filename: `Certificate-${certificateNumber}.pdf`, content: attachment, contentType: 'application/pdf' }]
    });
    res.json({ ok: true, sentTo: email, certificateNumber });
  } catch (err) {
    console.error('Certificate email failed:', err);
    res.status(502).json({ error: 'Certificate email could not be sent.' });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err instanceof multer.MulterError ? 400 : 400;
  res.status(status).json({ error: err.message || 'Request failed.' });
});
app.listen(PORT, () => console.log(`Amazing Scholar API listening on port ${PORT}`));
