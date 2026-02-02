const nodemailer = require('nodemailer');

class EmailService {
  constructor(db, reports) {
    this.db = db;
    this.reports = reports;
    this.transporter = null;
    this.emailConfigured = false;
  }

  checkEmailConfigured() {
    const smtpSettings = this.db.getSmtpSettings();
    this.emailConfigured = !!(smtpSettings && smtpSettings.host && smtpSettings.port && smtpSettings.user && smtpSettings.pass && smtpSettings.from);
    return this.emailConfigured;
  }

  async initTransporter() {
    const smtpSettings = this.db.getSmtpSettings();
    if (!smtpSettings || !smtpSettings.host || !smtpSettings.port || !smtpSettings.user || !smtpSettings.pass || !smtpSettings.from) {
      throw new Error('SMTP settings are not fully configured');
    }
    this.transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: Number(smtpSettings.port) === 465,
      auth: {
        user: smtpSettings.user,
        pass: smtpSettings.pass
      }
    });
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  generateReportHtml(report, period) {
    const { totalScreenTime, categoryBreakdown, productivityScore, balanceStatus, suggestions } = report;
    const suggestion = suggestions[0] || 'Keep up the good work!';

    let categoryHtml = '';
    for (const [category, time] of Object.entries(categoryBreakdown)) {
      categoryHtml += `<li>${category}: ${this.formatDuration(time)}</li>`;
    }

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            h2 { color: #555; }
            ul { list-style-type: none; padding: 0; }
            li { margin: 5px 0; }
            .highlight { font-weight: bold; color: #007bff; }
          </style>
        </head>
        <body>
          <h1>Digital Parent Hub - ${period.charAt(0).toUpperCase() + period.slice(1)} Report</h1>
          <h2>Total Screen Time: ${this.formatDuration(totalScreenTime)}</h2>
          <h2>Category Breakdown:</h2>
          <ul>
            ${categoryHtml}
          </ul>
          <h2>Productivity Score: <span class="highlight">${productivityScore}%</span></h2>
          <h2>Balance Status: <span class="highlight">${balanceStatus}</span></h2>
          <h2>Suggestion:</h2>
          <p>${suggestion}</p>
        </body>
      </html>
    `;
    return html;
  }

  async sendReportEmail(toEmail, report, period) {
    if (!this.transporter) {
      await this.initTransporter();
    }

    const smtpSettings = await this.db.getSmtpSettings();
    const html = this.generateReportHtml(report, period);

    const mailOptions = {
      from: smtpSettings.from,
      to: toEmail,
      subject: `Digital Parent Hub - ${period.charAt(0).toUpperCase() + period.slice(1)} Report`,
      html: html,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendDailyReportEmail(toEmail, date) {
    const report = await this.reports.generateDailyReport(date);
    await this.sendReportEmail(toEmail, report, 'daily');
  }

  async sendWeeklyReportEmail(toEmail, startDate) {
    const report = await this.reports.generateWeeklyReport(startDate);
    await this.sendReportEmail(toEmail, report, 'weekly');
  }

  async sendMonthlyReportEmail(toEmail, startDate) {
    const report = await this.reports.generateMonthlyReport(startDate);
    await this.sendReportEmail(toEmail, report, 'monthly');
  }

  async sendYearlyReportEmail(toEmail, startDate) {
    const report = await this.reports.generateYearlyReport(startDate);
    await this.sendReportEmail(toEmail, report, 'yearly');
  }

  // Auto-schedule email reports based on frequency and recipient settings
  scheduleAutomatedEmails() {
    if (!this.checkEmailConfigured()) {
      console.log('[EmailService] SMTP not configured, skipping automated emails');
      return;
    }

    try {
      const recipientEmail = this.db.getSetting('email_recipient');
      if (!recipientEmail) {
        console.log('[EmailService] No email recipient configured');
        return;
      }

      const freqStr = this.db.getSetting('report_frequency');
      const freq = freqStr ? JSON.parse(freqStr) : { daily: true, weekly: false, monthly: false, yearly: false };

      // Helper to send and log
      const sendReport = async (type, date) => {
        try {
          switch (type) {
            case 'daily':
              await this.sendDailyReportEmail(recipientEmail, date);
              console.log(`[EmailService] Daily report sent to ${recipientEmail}`);
              break;
            case 'weekly':
              await this.sendWeeklyReportEmail(recipientEmail, date);
              console.log(`[EmailService] Weekly report sent to ${recipientEmail}`);
              break;
            case 'monthly':
              await this.sendMonthlyReportEmail(recipientEmail, date);
              console.log(`[EmailService] Monthly report sent to ${recipientEmail}`);
              break;
            case 'yearly':
              await this.sendYearlyReportEmail(recipientEmail, date);
              console.log(`[EmailService] Yearly report sent to ${recipientEmail}`);
              break;
          }
        } catch (err) {
          console.error(`[EmailService] Error sending ${type} report:`, err.message);
        }
      };

      const now = new Date();

      // Send immediately if enabled
      if (freq.daily) sendReport('daily', now);
      if (freq.weekly) sendReport('weekly', now);
      if (freq.monthly) sendReport('monthly', now);
      if (freq.yearly) sendReport('yearly', now);

      // Schedule periodic sends (approximate times)
      if (freq.daily) {
        setInterval(() => sendReport('daily', new Date()), 24 * 60 * 60 * 1000);
      }
      if (freq.weekly) {
        setInterval(() => sendReport('weekly', new Date()), 7 * 24 * 60 * 60 * 1000);
      }
      if (freq.monthly) {
        setInterval(() => sendReport('monthly', new Date()), 30 * 24 * 60 * 60 * 1000);
      }
      if (freq.yearly) {
        setInterval(() => sendReport('yearly', new Date()), 365 * 24 * 60 * 60 * 1000);
      }
    } catch (err) {
      console.error('[EmailService] Error scheduling automated emails:', err.message);
    }
  }
}

module.exports = EmailService;