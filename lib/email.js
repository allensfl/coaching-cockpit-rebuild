// lib/email.js - Email Service mit Resend API
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email Templates
const emailTemplates = {
  welcome: {
    subject: '🎉 Willkommen bei KI-Coaching! Dein Trial startet jetzt',
    template: 'welcome'
  },
  day1: {
    subject: '📋 Erste Schritte erfolgreich? Hier ist deine Checkliste',
    template: 'day1'
  },
  day3: {
    subject: '🚀 Wie läuft dein Trial? Brauchst du Unterstützung?',
    template: 'day3'
  },
  day7: {
    subject: '⏰ Halbzeit! Entdecke jetzt die Advanced Features',
    template: 'day7'
  },
  day10: {
    subject: '🎯 Nur noch 4 Tage - Zeit für dein Upgrade!',
    template: 'day10'
  },
  day13: {
    subject: '🔥 Letzter Tag! Upgrade jetzt und spare 20%',
    template: 'day13'
  },
  day15: {
    subject: '⚡ Trial abgelaufen - Reaktiviere in 2 Klicks',
    template: 'day15'
  }
};

// Hauptfunktion für Email-Versand
export async function sendEmail(to, templateType, userData = {}) {
  const template = emailTemplates[templateType];
  if (!template) {
    throw new Error(`Template ${templateType} nicht gefunden`);
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'KI-Coaching <welcome@ki-online.coach>',
      to: [to],
      subject: template.subject,
      html: await generateEmailHTML(template.template, userData),
      text: await generateEmailText(template.template, userData)
    });

    if (error) {
      console.error('Resend Error:', error);
      throw new Error(`Email senden fehlgeschlagen: ${error.message}`);
    }

    console.log('Email erfolgreich gesendet:', data);
    return data;
  } catch (error) {
    console.error('Email Service Error:', error);
    throw error;
  }
}

// Welcome Email direkt nach Registration
export async function sendWelcomeEmail(coach) {
  return await sendEmail(coach.email, 'welcome', {
    firstName: coach.first_name,
    lastName: coach.last_name,
    company: coach.company,
    loginUrl: 'https://coaching-cockpit-rebuild-pkl0mw6ii-ki-coaching.vercel.app/dashboard',
    supportEmail: 'support@ki-online.coach'
  });
}

// Automatische Email-Sequenz starten
export async function startEmailSequence(coachId, email) {
  const sequences = [
    { day: 1, template: 'day1' },
    { day: 3, template: 'day3' },
    { day: 7, template: 'day7' },
    { day: 10, template: 'day10' },
    { day: 13, template: 'day13' },
    { day: 15, template: 'day15' }
  ];

  // Hier würdest du normalerweise einen Job Scheduler verwenden
  // Für jetzt loggen wir die geplanten Emails
  console.log(`Email-Sequenz gestartet für Coach ${coachId}:`);
  
  sequences.forEach(seq => {
    const sendDate = new Date();
    sendDate.setDate(sendDate.getDate() + seq.day);
    console.log(`- ${seq.template}: ${sendDate.toLocaleDateString()}`);
  });

  return sequences;
}

// HTML Email Template Generator
async function generateEmailHTML(templateName, data) {
  const templates = {
    welcome: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Willkommen bei KI-Coaching</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
          .content { padding: 40px 30px; }
          .welcome-box { background: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }
          .steps { margin: 30px 0; }
          .step { margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; }
          .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Willkommen bei KI-Coaching!</h1>
            <p>Dein 14-Tage Trial startet jetzt</p>
          </div>
          
          <div class="content">
            <div class="welcome-box">
              <h2>Hallo ${data.firstName}! 👋</h2>
              <p>Schön, dass du dabei bist! Dein KI-Coaching Trial ist ab sofort aktiv und läuft bis zum <strong>${new Date(Date.now() + 14*24*60*60*1000).toLocaleDateString('de-DE')}</strong>.</p>
            </div>

            <h3>🚀 Deine nächsten Schritte:</h3>
            <div class="steps">
              <div class="step">
                <strong>1. Dashboard erkunden</strong><br>
                Logge dich in dein persönliches Dashboard ein und schaue dir die verfügbaren Tools an.
              </div>
              <div class="step">
                <strong>2. Erste KI-Sitzung starten</strong><br>
                Teste unser Hauptfeature - die KI-gestützte Coaching-Sitzung mit deinem ersten Klienten.
              </div>
              <div class="step">
                <strong>3. Templates erkunden</strong><br>
                Entdecke unsere vorgefertigten Coaching-Templates für verschiedene Situationen.
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${data.loginUrl}" class="cta-button">Jetzt Dashboard öffnen 🚀</a>
            </div>

            <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-radius: 5px;">
              <h4>💡 Tipp: Maximiere dein Trial</h4>
              <p>In den nächsten 14 Tagen senden wir dir hilfreiche Tipps und Tutorials, damit du das Beste aus deinem Trial herausholst.</p>
            </div>
          </div>

          <div class="footer">
            <p>Fragen? Antworte einfach auf diese Email oder schreibe an <a href="mailto:${data.supportEmail}">${data.supportEmail}</a></p>
            <p>KI-Coaching Team 🤖</p>
          </div>
        </div>
      </body>
      </html>
    `,
    
    day1: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Tag 1 Check-in</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
          .header { background: #28a745; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .checklist { margin: 20px 0; }
          .checklist-item { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }
          .cta-button { display: inline-block; background: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Tag 1 Check-in</h1>
            <p>Wie laufen deine ersten Schritte?</p>
          </div>
          
          <div class="content">
            <p>Hallo ${data.firstName || 'Coach'}!</p>
            
            <p>Gestern hast du dich für unser KI-Coaching Trial registriert. Wunderbar! 🎉</p>
            
            <h3>✅ Hast du schon alles ausprobiert?</h3>
            <div class="checklist">
              <div class="checklist-item">🔐 Dashboard Login</div>
              <div class="checklist-item">🤖 Erste KI-Coaching Sitzung</div>
              <div class="checklist-item">📝 Template Bibliothek angeschaut</div>
              <div class="checklist-item">⚙️ Profil konfiguriert</div>
            </div>

            <p>Falls du Unterstützung brauchst, sind wir da! Antworte einfach auf diese Email.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl || '#'}" class="cta-button">Weiter im Dashboard →</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,

    day7: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Halbzeit! Advanced Features</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
          .header { background: #ff6b35; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .feature-box { margin: 15px 0; padding: 20px; background: #fff5f5; border-left: 4px solid #ff6b35; border-radius: 5px; }
          .cta-button { display: inline-block; background: #ff6b35; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Halbzeit erreicht!</h1>
            <p>7 Tage Trial - Zeit für Advanced Features</p>
          </div>
          
          <div class="content">
            <p>Hi ${data.firstName || 'Coach'}! 👋</p>
            
            <p>Du bist bereits eine Woche dabei - großartig! Zeit, die Advanced Features zu entdecken:</p>
            
            <div class="feature-box">
              <h4>🧠 KI-Persönlichkeitsanalyse</h4>
              <p>Lass die KI Persönlichkeitsprofile deiner Klienten erstellen für gezielteren Coaching-Ansatz.</p>
            </div>
            
            <div class="feature-box">
              <h4>📊 Coaching-Analytics</h4>
              <p>Verfolge den Fortschritt deiner Klienten mit automatischen Analysen und Insights.</p>
            </div>
            
            <div class="feature-box">
              <h4>🎯 Ziel-Tracking</h4>
              <p>Setze und verfolge SMART-Ziele mit KI-Unterstützung für bessere Ergebnisse.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl || '#'}" class="cta-button">Advanced Features testen 🚀</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">Noch 7 Tage Trial übrig - nutze sie optimal!</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return templates[templateName] || templates.welcome;
}

// Text Version für Email Clients ohne HTML
async function generateEmailText(templateName, data) {
  const templates = {
    welcome: `
Willkommen bei KI-Coaching!

Hallo ${data.firstName}!

Schön, dass du dabei bist! Dein KI-Coaching Trial ist ab sofort aktiv und läuft bis zum ${new Date(Date.now() + 14*24*60*60*1000).toLocaleDateString('de-DE')}.

Deine nächsten Schritte:
1. Dashboard erkunden: ${data.loginUrl}
2. Erste KI-Sitzung starten
3. Templates erkunden

Bei Fragen: ${data.supportEmail}

KI-Coaching Team
    `,
    day1: `
Tag 1 Check-in

Hallo ${data.firstName || 'Coach'}!

Wie laufen deine ersten Schritte mit KI-Coaching?

Checklist:
- Dashboard Login
- Erste KI-Coaching Sitzung
- Template Bibliothek
- Profil konfiguriert

Dashboard: ${data.loginUrl || 'Link folgt'}

Bei Fragen einfach antworten!
    `,
    day7: `
Halbzeit erreicht! 

Hi ${data.firstName || 'Coach'}!

7 Tage Trial - Zeit für Advanced Features:

- KI-Persönlichkeitsanalyse
- Coaching-Analytics  
- Ziel-Tracking

Dashboard: ${data.loginUrl || 'Link folgt'}

Noch 7 Tage übrig - nutze sie optimal!
    `
  };

  return templates[templateName] || templates.welcome;
}