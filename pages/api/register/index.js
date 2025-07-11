// api/register/index.js - Komplette Trial Management Version
module.exports = async function handler(req, res) {
  console.log('=== TRIAL MANAGEMENT API ===');
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Body parsing
    let parsedBody;
    if (typeof req.body === 'string') {
      parsedBody = JSON.parse(req.body);
    } else {
      parsedBody = req.body;
    }
    
    const { name, email, phone, company, coaching_experience, bio } = parsedBody;
    
    console.log('Registration request:', { name, email, company });
    
    if (!name || !email) {
      return res.status(400).json({ 
        error: 'Name und Email erforderlich'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Ungültiges Email-Format'
      });
    }

    // Namen aufteilen
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Trial Dates berechnen
    const now = new Date();
    const trialStart = now.toISOString();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log('Trial period:', { start: trialStart, end: trialEnd });

    // Supabase Integration mit Trial Management
    let supabaseResult = null;
    let newCoach = null;
    
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      try {
        console.log('Connecting to Supabase...');
        
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY
        );

        // Check for existing email
        const { data: existingCoach } = await supabase
          .from('coaches')
          .select('email')
          .eq('email', email.toLowerCase().trim())
          .maybeSingle();

        if (existingCoach) {
          console.log('Email already exists');
          return res.status(409).json({ 
            error: 'Email bereits registriert'
          });
        }

        // Insert mit Trial Management
        const insertData = {
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase().trim(),
          phone: phone || null,
          company: company || null,
          coaching_experience: coaching_experience || null,
          bio: bio || null,
          trial_start_date: trialStart,
          trial_end_date: trialEnd,
          status: 'trial_active',
          email_sequence_started: false
        };

        console.log('Inserting with trial data:', insertData);

        const { data, error } = await supabase
          .from('coaches')
          .insert([insertData])
          .select();

        if (error) {
          console.error('Supabase Error:', error);
          supabaseResult = { error: error.message };
        } else {
          console.log('Coach saved with trial management:', data[0]);
          newCoach = data[0];
          supabaseResult = { success: true };
        }
        
      } catch (supabaseError) {
        console.error('Supabase Connection Error:', supabaseError);
        supabaseResult = { error: supabaseError.message };
      }
    }

    // Email Integration
    let emailResult = null;
    
    if (newCoach && process.env.RESEND_API_KEY) {
      try {
        console.log('Sending welcome email to:', email);
        
        // Dynamic import für Resend
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        // Calculate trial end date for email
        const trialEndDate = new Date(newCoach.trial_end_date).toLocaleDateString('de-DE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        // Professional Welcome Email Template
        const welcomeEmailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Willkommen bei KI-Coaching</title>
            <style>
              body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
              .content { padding: 40px 30px; }
              .welcome-box { background: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
              .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }
              .trial-info { background: #e8f5e8; border: 1px solid #4caf50; padding: 20px; border-radius: 5px; margin: 20px 0; }
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
                  <h2>Hallo ${firstName}! 👋</h2>
                  <p>Schön, dass du dabei bist! Dein KI-Coaching Trial ist ab sofort aktiv.</p>
                </div>

                <div class="trial-info">
                  <h3>📅 Dein Trial im Überblick</h3>
                  <p><strong>Trial Start:</strong> Heute, ${new Date().toLocaleDateString('de-DE')}</p>
                  <p><strong>Trial Ende:</strong> ${trialEndDate}</p>
                  <p><strong>Verbleibende Tage:</strong> 14 Tage</p>
                </div>

                <h3>🚀 Deine nächsten Schritte:</h3>
                <div class="steps">
                  <div class="step">
                    <strong>1. Dashboard erkunden</strong><br>
                    Logge dich in dein persönliches Dashboard ein und schaue dir die verfügbaren Tools an.
                  </div>
                  <div class="step">
                    <strong>2. Erste KI-Sitzung starten</strong><br>
                    Teste unser Hauptfeature - die KI-gestützte Coaching-Sitzung.
                  </div>
                  <div class="step">
                    <strong>3. Templates erkunden</strong><br>
                    Entdecke unsere vorgefertigten Coaching-Templates für verschiedene Situationen.
                  </div>
                </div>

                <div style="text-align: center;">
                  <a href="https://ki-online.coach/dashboard?utm_source=welcome_email&utm_campaign=trial_start" class="cta-button">Jetzt Dashboard öffnen 🚀</a>
                </div>

                <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-radius: 5px;">
                  <h4>💡 Tipp: Maximiere dein Trial</h4>
                  <p>In den nächsten 14 Tagen senden wir dir hilfreiche Tipps und Tutorials, damit du das Beste aus deinem Trial herausholst. Bleib dran!</p>
                </div>
              </div>

              <div class="footer">
                <p>Fragen? Antworte einfach auf diese Email oder schreibe an support@ki-online.coach</p>
                <p>KI-Coaching Team 🤖</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const textVersion = `
Willkommen bei KI-Coaching!

Hallo ${firstName}!

Schön, dass du dabei bist! Dein KI-Coaching Trial ist ab sofort aktiv.

TRIAL ÜBERSICHT:
- Start: ${new Date().toLocaleDateString('de-DE')}
- Ende: ${trialEndDate}
- Verbleibende Tage: 14

NÄCHSTE SCHRITTE:
1. Dashboard erkunden
2. Erste KI-Sitzung starten  
3. Templates entdecken

Dashboard: https://ki-online.coach/dashboard

Fragen? support@ki-online.coach

KI-Coaching Team
        `;

        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'KI-Coaching <noreply@resend.dev>',
          to: [email],
          subject: '🎉 Willkommen bei KI-Coaching! Dein 14-Tage Trial startet jetzt',
          html: welcomeEmailHtml,
          text: textVersion
        });

        if (emailError) {
          console.error('Email Error:', emailError);
          emailResult = { error: emailError.message };
        } else {
          console.log('Welcome email sent successfully:', emailData.id);
          emailResult = { success: true, id: emailData.id };
          
          // Mark email sequence as started
          try {
            await supabase
              .from('coaches')
              .update({ email_sequence_started: true })
              .eq('id', newCoach.id);
            console.log('Email sequence marked as started');
          } catch (updateError) {
            console.log('Could not update email sequence flag:', updateError);
          }
        }

      } catch (emailSendError) {
        console.error('Email Send Error:', emailSendError);
        emailResult = { error: emailSendError.message };
      }
    } else {
      console.log('Email not sent - missing requirements');
      emailResult = { error: 'Email configuration missing' };
    }

    // Final Response with Trial Management
    const response = {
      success: true,
      message: emailResult?.success 
        ? 'Registrierung erfolgreich! Welcome Email wurde versendet.' 
        : 'Registrierung erfolgreich! Email wird nachgesendet.',
      data: {
        id: newCoach?.id,
        name: `${firstName} ${lastName}`.trim(),
        email: email,
        trial_start_date: newCoach?.trial_start_date,
        trial_end_date: newCoach?.trial_end_date,
        trial_days_remaining: 14,
        status: newCoach?.status || 'trial_active',
        database_saved: !!supabaseResult?.success,
        email_sent: !!emailResult?.success
      }
    };
    
    console.log('Registration with trial management completed:', response);
    return res.status(201).json(response);
    
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ 
      error: 'Registrierung fehlgeschlagen',
      details: error.message
    });
  }
};