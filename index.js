import http from 'node:http';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.EMAIL_SERVER_PORT ?? 4000);
const HOST = process.env.EMAIL_SERVER_HOST ?? '0.0.0.0';
const API_KEY = process.env.EMAIL_API_KEY?.trim();
const SMTP_HOST = process.env.SMTP_HOST?.trim();
const SMTP_PORT = Number(process.env.SMTP_PORT ?? '587');
const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASS = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD)?.trim();
const SMTP_FROM = process.env.SMTP_FROM?.trim();
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME?.trim() || 'Complete My Project';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || process.env.SMTP_FROM || 'info@completemyproject.co.uk').trim();
const APP_URL = (process.env.APP_URL || 'https://completemyproject.co.uk').replace(/\/$/, '');

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
  console.error(
    'Missing SMTP configuration. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.',
  );
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

function jsonResponse(res, status, body) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.EMAIL_ALLOW_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function mask(value) {
  return String(value || '').replace(/.(?=.{4})/g, '*');
}

function asString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing or invalid field: ${field}`);
  }
  return value.trim();
}

function asStrings(value, field) {
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  if (Array.isArray(value) && value.length) {
    return value.map((item, index) => {
      if (typeof item !== 'string' || !item.trim()) {
        throw new Error(`Missing or invalid field: ${field}[${index}]`);
      }
      return item.trim();
    });
  }
  throw new Error(`Missing or invalid field: ${field}`);
}

function buildLayout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f7f5f0; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .email-wrapper { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e3a4a 0%, #254472 100%); color: #fff; padding: 32px 24px; text-align: center; }
    .header-logo { font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }
    .content { padding: 32px 24px; color: #1a1a1a; line-height: 1.6; }
    .content p { margin: 0 0 16px 0; font-size: 15px; }
    .content p:last-child { margin-bottom: 0; }
    .content strong { color: #254472; font-weight: 600; }
    .footer { background: #f7f5f0; padding: 24px; text-align: center; border-top: 1px solid #e8e4dc; font-size: 13px; color: #6b7280; }
    .footer-text { margin: 0; }
    .divider { height: 1px; background: #e8e4dc; margin: 24px 0; }
    .cta-button { display: inline-block; background: #1A8D93; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; }
    .badge { display: inline-block; background: #eef5f9; color: #0f6d75; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    td { padding: 10px 0; border-bottom: 1px solid #e8e4dc; }
    td:first-child { font-weight: 600; color: #254472; width: 140px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="header">
        <h1 class="header-logo">Complete My Project</h1>
      </div>
      <div class="content">
        ${bodyHtml}
      </div>
      <div class="footer">
        <p class="footer-text"><strong>Complete My Project</strong><br/>4 Railway Street, Huddersfield, HD1 1JP<br/>📧 info@completemyproject.co.uk</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildContactUserEmail({ name, email, topic }) {
  const subject = `Thanks for contacting Complete My Project`;
  const text = `Hi ${name},\n\nThanks for your message about ${topic}. Our team will review it and get back to you within one business day.\n\nBest regards,\nComplete My Project`;
  const html = buildLayout(subject, `
    <p>Hi <strong>${name}</strong>,</p>
    <p>Thanks for your message about <strong>${topic}</strong>. Our team will review it and get back to you within one business day.</p>
    <div class="divider"></div>
    <p><strong>What happens next?</strong><br/>We've received your enquiry and will prioritize your request. You can expect a response soon.</p>
    <p style="margin-top: 24px; color: #6b7280;">If you need immediate assistance, feel free to call us on our office number or email us directly.</p>
  `);
  return { to: email, subject, text, html };
}

function buildContactAdminEmail({ name, email, phone, topic, message }) {
  const subject = `New contact message — ${topic}`;
  const text = `New contact submission\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "(none)"}\nTopic: ${topic}\n\nMessage:\n${message}`;
  const html = buildLayout(subject, `
    <div class="badge">New Contact</div>
    <p><strong>You have a new contact submission:</strong></p>
    <table>
      <tr><td>Name</td><td>${name}</td></tr>
      <tr><td>Email</td><td><a href="mailto:${email}" style="color: #1A8D93; text-decoration: none;">${email}</a></td></tr>
      <tr><td>Phone</td><td>${phone || "—"}</td></tr>
      <tr><td>Topic</td><td><strong>${topic}</strong></td></tr>
    </table>
    <div class="divider"></div>
    <p><strong>Message:</strong></p>
    <div style="background: #f7f5f0; padding: 16px; border-radius: 6px; border-left: 4px solid #1A8D93;">
      <p style="margin: 0; white-space: pre-wrap;">${message}</p>
    </div>
    <p style="margin-top: 24px; text-align: center;">
      <a href="mailto:${email}?subject=Re: ${encodeURIComponent(topic)}" class="cta-button" style="display:inline-block;background:#1A8D93;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;font-family:Arial,sans-serif;">Reply to ${name}</a>
    </p>
  `);
  return { to: ADMIN_EMAIL, subject, text, html };
}

function buildPartnershipUserEmail({ name, email, company, partnerType }) {
  const subject = `Thanks for your partnership enquiry`;
  const text = `Hi ${name},\n\nThanks for your enquiry to partner with Complete My Project as a ${partnerType} for ${company}. Our team will be in touch shortly.\n\nBest regards,\nComplete My Project`;
  const html = buildLayout(subject, `
    <p>Hi <strong>${name}</strong>,</p>
    <p>Thank you for your interest in partnering with Complete My Project! We're excited to explore how <strong>${company}</strong> can work with us.</p>
    <p><strong>Partnership Type:</strong> ${partnerType}</p>
    <div class="divider"></div>
    <p><strong>What's next?</strong><br/>Our partnerships team will review your application and reach out within one working day to discuss opportunities and next steps.</p>
    <p style="margin-top: 24px; color: #6b7280;">In the meantime, if you have any questions, feel free to reply to this email or contact us directly.</p>
  `);
  return { to: email, subject, text, html };
}

function buildPartnershipAdminEmail({ name, email, phone, company, partnerType, message }) {
  const subject = `New partnership enquiry — ${company}`;
  const text = `New partnership submission\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "(none)"}\nCompany: ${company}\nType: ${partnerType}\n\nMessage:\n${message}`;
  const html = buildLayout(subject, `
    <div class="badge">Partnership Enquiry</div>
    <p><strong>You have a new partnership opportunity:</strong></p>
    <table>
      <tr><td>Company</td><td><strong>${company}</strong></td></tr>
      <tr><td>Contact</td><td>${name}</td></tr>
      <tr><td>Email</td><td><a href="mailto:${email}" style="color: #1A8D93; text-decoration: none;">${email}</a></td></tr>
      <tr><td>Phone</td><td>${phone || "—"}</td></tr>
      <tr><td>Type</td><td><strong>${partnerType}</strong></td></tr>
    </table>
    <div class="divider"></div>
    <p><strong>Message:</strong></p>
    <div style="background: #f7f5f0; padding: 16px; border-radius: 6px; border-left: 4px solid #1A8D93;">
      <p style="margin: 0; white-space: pre-wrap;">${message}</p>
    </div>
    <p style="margin-top: 24px; text-align: center;">
      <a href="mailto:${email}?subject=Re: Partnership Enquiry - ${encodeURIComponent(company)}" class="cta-button" style="display:inline-block;background:#1A8D93;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;font-family:Arial,sans-serif;">Contact ${name}</a>
    </p>
  `);
  return { to: ADMIN_EMAIL, subject, text, html };
}

function buildSmtpTestEmail() {
  return {
    to: ADMIN_EMAIL,
    subject: 'SMTP Test — Complete My Project',
    text: "If you received this, SMTP credentials are working.",
    html: buildLayout('SMTP Test — Complete My Project', `
      <div class="badge">SMTP Test</div>
      <p><strong>Email system is working!</strong></p>
      <p>If you're seeing this message, your SMTP credentials are configured correctly and emails are being sent successfully.</p>
      <div class="divider"></div>
      <p style="color: #6b7280; font-size: 14px;">Test sent at ${new Date().toLocaleString()}</p>
    `),
  };
}

function buildCustomEmail({ to, subject, text, html }) {
  return {
    to: asStrings(to, 'to'),
    subject,
    text,
    html: html?.trim() ? html : buildLayout(subject, `<div style="white-space: pre-wrap; font-family: monospace; background: #f7f5f0; padding: 16px; border-radius: 6px; border-left: 4px solid #1A8D93;">${text}</div>`),
  };
}

function buildQuoteSubmittedUserEmail({ name, email, enquiryId, projectType, postcode }) {
  const subject = `Your project quote request has been received`;
  const text = `We've received your project enquiry for ${projectType} in ${postcode}.\n\nOur network of vetted contractors will review your project and you'll receive up to 3 competitive quotes within 24 hours.\n\nBest regards,\nComplete My Project`;
  const html = buildLayout(subject, `
    <p>Thank you for submitting your project details! We've received your enquiry and our team is reviewing it now.</p>
    <table>
      <tr><td>Project Type</td><td>${projectType}</td></tr>
      <tr><td>Postcode</td><td>${postcode}</td></tr>
    </table>
    <div class="divider"></div>
    <p><strong>What happens next:</strong></p>
    <p>We'll match your project with vetted contractors in your area. You can expect <strong>up to 3 quotes within 24 hours</strong>.</p>
  `);
  return { to: email, subject, text, html };
}

function buildQuoteSubmittedAdminEmail({ name, email, enquiryId, projectType, postcode, description }) {
  const subject = `New project enquiry — ${projectType}`;
  const text = `New project enquiry\n\nEnquiry ID: ${enquiryId}\nName: ${name}\nEmail: ${email}\nProject Type: ${projectType}\nPostcode: ${postcode}\n\nDescription:\n${description}`;
  const html = buildLayout(subject, `
    <div class="badge">New Enquiry</div>
    <p><strong>You have a new project enquiry:</strong></p>
    <table>
      <tr><td>Enquiry ID</td><td><code style="background: #f7f5f0; padding: 4px 8px; border-radius: 3px; font-family: monospace; color: #254472;">${enquiryId}</code></td></tr>
      <tr><td>Name</td><td>${name}</td></tr>
      <tr><td>Email</td><td><a href="mailto:${email}" style="color: #1A8D93; text-decoration: none;">${email}</a></td></tr>
      <tr><td>Project Type</td><td><strong>${projectType}</strong></td></tr>
      <tr><td>Postcode</td><td>${postcode}</td></tr>
    </table>
    <div class="divider"></div>
    <p><strong>Project Description:</strong></p>
    <div style="background: #f7f5f0; padding: 16px; border-radius: 6px; border-left: 4px solid #1A8D93;">
      <p style="margin: 0; white-space: pre-wrap;">${description}</p>
    </div>
  `);
  return { to: ADMIN_EMAIL, subject, text, html };
}

function buildAccountPendingReviewUserEmail({ email, contactName, businessName, phone, businessType }) {
  const subject = `Your Complete My Project account is under review`;
  const text = `Hi ${contactName},\n\nThank you for registering with Complete My Project! We've received your application for ${businessName} (${businessType || "Contractor"}).\n\nYour account is currently under review as we verify your credentials and vetting information. This typically takes 1-2 business days.\n\nWe'll email you as soon as your account has been approved or if we need any additional information.\n\nBest regards,\nComplete My Project`;
  const html = buildLayout(subject, `
    <p>Hi <strong>${contactName}</strong>,</p>
    <p>Thank you for registering with Complete My Project! We're excited to have <strong>${businessName}</strong> join our network.</p>
    <div style="background: #eef5f9; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #1A8D93;">
      <p style="margin: 0;"><strong>Account Status:</strong> <span style="color: #f59e0b;">Under Review</span></p>
    </div>
    <p><strong>What happens next:</strong></p>
    <p>Our vetting team is reviewing your application and credentials. This typically takes <strong>1-2 business days</strong>.</p>
    <p>We'll send you an email confirmation once your account has been approved, or if we need any additional information from you.</p>
    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">If you have any questions in the meantime, please don't hesitate to contact us.</p>
  `);
  return { to: email, subject, text, html };
}

function buildAccountPendingReviewAdminEmail({ email, contactName, businessName, phone, businessType }) {
  const subject = `New contractor registration pending approval`;
  const text = `New contractor application\n\nName: ${contactName}\nEmail: ${email}\nBusiness: ${businessName}\nType: ${businessType || "Contractor"}\nPhone: ${phone || "(none)"}`;
  const html = buildLayout(subject, `
    <div class="badge">New Registration</div>
    <p><strong>A new contractor application has been submitted and is pending review.</strong></p>
    <table>
      <tr><td>Name</td><td>${contactName}</td></tr>
      <tr><td>Email</td><td><a href="mailto:${email}" style="color: #1A8D93; text-decoration: none;">${email}</a></td></tr>
      <tr><td>Business</td><td><strong>${businessName}</strong></td></tr>
      <tr><td>Type</td><td>${businessType || "Contractor"}</td></tr>
      <tr><td>Phone</td><td>${phone || "—"}</td></tr>
    </table>
  `);
  return { to: ADMIN_EMAIL, subject, text, html };
}

function buildAccountApprovedEmail({ email, contactName, businessName }) {
  const subject = `Your Complete My Project account is approved! 🎉`;
  const text = `Hi ${contactName},\n\nGreat news! Your account for ${businessName} has been approved and you're now active on Complete My Project.\n\nYou can now start receiving project opportunities and quotes from customers.\n\nLog in to your dashboard to view available projects.\n\nBest regards,\nComplete My Project`;
  const html = buildLayout(subject, `
    <p>Hi <strong>${contactName}</strong>,</p>
    <p>Excellent news! Your account for <strong>${businessName}</strong> has been approved by our vetting team. 🎉</p>
    <div style="background: #ecfdf5; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #10b981;">
      <p style="margin: 0;"><strong>Account Status:</strong> <span style="color: #10b981;">✓ Active</span></p>
    </div>
    <p><strong>You're ready to go!</strong></p>
    <p>You can now start viewing and responding to project opportunities from customers in your area. Log in to your dashboard to get started.</p>
    <p style="text-align: center; margin-top: 24px;">
      <a href="${APP_URL}/trades-dashboard" class="cta-button" style="display:inline-block;background:#1A8D93;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;font-family:Arial,sans-serif;">Go to Dashboard</a>
    </p>
    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">If you have any questions or need support, we're here to help!</p>
  `);
  return { to: email, subject, text, html };
}

function buildAccountRejectedEmail({ email, contactName, businessName }) {
  const subject = `Update on your Complete My Project application`;
  const text = `Hi ${contactName},\n\nThank you for your interest in joining Complete My Project. Unfortunately, we were unable to approve your application for ${businessName} at this time.\n\nIf you have any questions about this decision or would like more information, please don't hesitate to contact us.\n\nBest regards,\nComplete My Project`;
  const html = buildLayout(subject, `
    <p>Hi <strong>${contactName}</strong>,</p>
    <p>Thank you for your interest in joining Complete My Project. We appreciate the opportunity to consider your application.</p>
    <p>Unfortunately, after reviewing your credentials and vetting information, we were unable to approve your application for <strong>${businessName}</strong> at this time.</p>
    <div class="divider"></div>
    <p>If you have any questions about this decision or would like more information on how to strengthen your application in the future, please feel free to reach out to our team. We'd be happy to discuss this with you.</p>
    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">Contact us: info@completemyproject.co.uk</p>
  `);
  return { to: email, subject, text, html };
}

function buildTradeJobCreatedUserEmail({ businessName, contractorEmail, customerName, postcode, status, inspectionDate, comments }) {
  const subject = `New project opportunity for ${customerName} — ${postcode}`;
  const text = `Hi ${businessName},\n\nYou've been matched with a new project opportunity from ${customerName} in ${postcode}.\n\nProject Status: ${status}\n${inspectionDate ? `Inspection Date: ${inspectionDate}` : ""}\n${comments ? `Comments: ${comments}` : ""}\n\nLog in to your dashboard to view full details and respond.\n\nBest regards,\nComplete My Project`;
  const html = buildLayout(subject, `
    <p>Hi <strong>${businessName}</strong>,</p>
    <p>Great news! You've been matched with a new project opportunity.</p>
    <table>
      <tr><td>Customer</td><td>${customerName}</td></tr>
      <tr><td>Location</td><td>${postcode}</td></tr>
      <tr><td>Status</td><td><strong>${status}</strong></td></tr>
      ${inspectionDate ? `<tr><td>Inspection Date</td><td>${inspectionDate}</td></tr>` : ""}
    </table>
    ${comments ? `<div class="divider"></div><p><strong>Customer Comments:</strong></p><div style="background: #f7f5f0; padding: 16px; border-radius: 6px; border-left: 4px solid #1A8D93;"><p style="margin: 0; white-space: pre-wrap;">${comments}</p></div>` : ""}
    <p style="text-align: center; margin-top: 24px;">
      <a href="${APP_URL}/trades-dashboard" class="cta-button" style="display:inline-block;background:#1A8D93;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;font-family:Arial,sans-serif;">View on Dashboard</a>
    </p>
  `);
  return { to: contractorEmail, subject, text, html };
}

function buildTradeJobCreatedAdminEmail({ businessName, contractorEmail, customerName, postcode, status, inspectionDate, comments }) {
  const subject = `New job created by ${businessName} — ${postcode}`;
  const text = `New job created\n\nContractor: ${businessName}\nEmail: ${contractorEmail}\nCustomer: ${customerName}\nPostcode: ${postcode}\nStatus: ${status}\n${inspectionDate ? `Inspection Date: ${inspectionDate}\n` : ""}${comments ? `Comments: ${comments}\n` : ""}`;
  const html = buildLayout(subject, `
    <div class="badge">New Job Created</div>
    <p><strong>A contractor has created a new job request.</strong></p>
    <table>
      <tr><td>Contractor</td><td>${businessName}</td></tr>
      <tr><td>Contractor Email</td><td><a href="mailto:${contractorEmail}" style="color: #1A8D93; text-decoration: none;">${contractorEmail}</a></td></tr>
      <tr><td>Customer</td><td>${customerName}</td></tr>
      <tr><td>Location</td><td>${postcode}</td></tr>
      <tr><td>Status</td><td><strong>${status}</strong></td></tr>
      ${inspectionDate ? `<tr><td>Inspection Date</td><td>${inspectionDate}</td></tr>` : ""}
    </table>
    ${comments ? `<div class="divider"></div><p><strong>Comments:</strong></p><div style="background: #f7f5f0; padding: 16px; border-radius: 6px; border-left: 4px solid #1A8D93;"><p style="margin: 0; white-space: pre-wrap;">${comments}</p></div>` : ""}
  `);
  return { to: ADMIN_EMAIL, subject, text, html };
}

async function sendMail(message) {
  const mailOptions = {
    from: `${SMTP_FROM_NAME} <${SMTP_FROM}>`,
    ...message,
  };
  console.log('[email] sending', {
    to: mailOptions.to,
    cc: mailOptions.cc,
    bcc: mailOptions.bcc,
    subject: mailOptions.subject,
  });
  const info = await transporter.sendMail(mailOptions);
  console.log('[email] sent', {
    accepted: info.accepted,
    rejected: info.rejected,
    messageId: info.messageId,
  });
  return info;
}

async function handleRequest(req, res) {
  const origin = req.headers.origin || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.EMAIL_ALLOW_ORIGIN || origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // Allow any path ending in /email/send (handles both direct and rewritten paths)
  const pathname = (req.url || '').split('?')[0];
  if (!pathname.endsWith('/email/send') && pathname !== '/email/send') {
    jsonResponse(res, 404, { error: 'Not found' });
    return;
  }

  if (req.method !== 'POST') {
    jsonResponse(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (API_KEY) {
    const authHeader = req.headers.authorization?.trim();
    const xApiKey = req.headers['x-api-key']?.trim();
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (bearer !== API_KEY && xApiKey !== API_KEY) {
      jsonResponse(res, 401, { error: 'Unauthorized' });
      return;
    }
  }

  try {
    const payload = await parseBody(req);
    const type = asString(payload.type, 'type');
    const data = payload.data || {};
    let mailPromises = [];

    switch (type) {
      case 'smtp_test': {
        mailPromises.push(sendMail(buildSmtpTestEmail()));
        break;
      }
      case 'custom_email': {
        mailPromises.push(sendMail(buildCustomEmail(data)));
        break;
      }
      case 'contact_submitted': {
        const name = asString(data.name, 'name');
        const email = asString(data.email, 'email');
        const phone = optionalString(data.phone) || '';
        const topic = asString(data.topic, 'topic');
        const message = asString(data.message, 'message');
        mailPromises.push(sendMail(buildContactAdminEmail({ name, email, phone, topic, message })));
        mailPromises.push(sendMail(buildContactUserEmail({ name, email, topic })));
        break;
      }
      case 'partnership_submitted': {
        const name = asString(data.name, 'name');
        const email = asString(data.email, 'email');
        const phone = asString(data.phone, 'phone');
        const company = asString(data.company, 'company');
        const partnerType = asString(data.partnerType, 'partnerType');
        const message = asString(data.message, 'message');
        mailPromises.push(sendMail(buildPartnershipAdminEmail({ name, email, phone, company, partnerType, message })));
        mailPromises.push(sendMail(buildPartnershipUserEmail({ name, email, company, partnerType })));
        break;
      }
      case 'quote_submitted': {
        const enquiryId = asString(data.enquiryId, 'enquiryId');
        const name = asString(data.name, 'name');
        const email = asString(data.email, 'email');
        const phone = asString(data.phone, 'phone');
        const projectType = asString(data.projectType, 'projectType');
        const postcode = asString(data.postcode, 'postcode');
        const description = asString(data.description, 'description');
        mailPromises.push(sendMail(buildQuoteSubmittedUserEmail({ name, email, enquiryId, projectType, postcode })));
        mailPromises.push(sendMail(buildQuoteSubmittedAdminEmail({ name, email, enquiryId, projectType, postcode, description })));
        break;
      }
      case 'account_pending_review': {
        const email = asString(data.email, 'email');
        const contactName = asString(data.contactName, 'contactName');
        const businessName = asString(data.businessName, 'businessName');
        const phone = optionalString(data.phone) || '';
        const businessType = optionalString(data.businessType) || '';
        mailPromises.push(sendMail(buildAccountPendingReviewUserEmail({ email, contactName, businessName, phone, businessType })));
        mailPromises.push(sendMail(buildAccountPendingReviewAdminEmail({ email, contactName, businessName, phone, businessType })));
        break;
      }
      case 'account_approved': {
        const email = asString(data.email, 'email');
        const contactName = asString(data.contactName, 'contactName');
        const businessName = asString(data.businessName, 'businessName');
        mailPromises.push(sendMail(buildAccountApprovedEmail({ email, contactName, businessName })));
        break;
      }
      case 'account_rejected': {
        const email = asString(data.email, 'email');
        const contactName = asString(data.contactName, 'contactName');
        const businessName = asString(data.businessName, 'businessName');
        mailPromises.push(sendMail(buildAccountRejectedEmail({ email, contactName, businessName })));
        break;
      }
      case 'trade_job_created': {
        const businessName = asString(data.businessName, 'businessName');
        const contractorEmail = asString(data.contractorEmail, 'contractorEmail');
        const customerName = asString(data.customerName, 'customerName');
        const postcode = asString(data.postcode, 'postcode');
        const status = asString(data.status, 'status');
        const inspectionDate = optionalString(data.inspectionDate) || '';
        const comments = optionalString(data.comments) || '';
        mailPromises.push(sendMail(buildTradeJobCreatedAdminEmail({ businessName, contractorEmail, customerName, postcode, status, inspectionDate, comments })));
        mailPromises.push(sendMail(buildTradeJobCreatedUserEmail({ businessName, contractorEmail, customerName, postcode, status, inspectionDate, comments })));
        break;
      }
      default: {
        jsonResponse(res, 400, { error: `Unsupported email type: ${type}` });
        return;
      }
    }

    await Promise.all(mailPromises);
    jsonResponse(res, 200, { ok: true });
  } catch (error) {
    console.error('email-server error:', error);
    jsonResponse(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}

function optionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

// Export handler for Vercel serverless
export default handleRequest;

// Start HTTP server only in non-serverless environments (local / Docker)
if (!process.env.VERCEL) {
  const server = http.createServer(handleRequest);
  server.listen(PORT, HOST, () => {
    console.log(`Email server running on http://${HOST}:${PORT}`);
    console.log(`Email endpoint: http://${HOST}:${PORT}/email/send`);
  });
}
