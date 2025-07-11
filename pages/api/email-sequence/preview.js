// ========================================
// FILE: api/email-sequence/preview.js
// Email Template Preview System
// ========================================

const { createClient } = require('@supabase/supabase-js');
const { generateEmail, getEmailSubject } = require('../../lib/emailTemplates');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { coach_id, email_type, variant = 'a', format = 'html' } = req.query;

  if (!coach_id || !email_type) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      required: ['coach_id', 'email_type'],
      optional: ['variant', 'format'],
      example: '/api/email-sequence/preview?coach_id=7&email_type=day1_checkin&variant=a'
    });
  }

  try {
    console.log(`🔍 Preview request: ${email_type} for coach ${coach_id} (variant: ${variant})`);

    // Get coach data
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('*')
      .eq('id', coach_id)
      .single();

    if (coachError || !coach) {
      return res.status(404).json({ 
        error: 'Coach not found',
        coach_id 
      });
    }

    // Generate email content
    const emailContent = generateEmail(coach, email_type, { variant });

    // Return JSON format for API testing
    if (format === 'json') {
      return res.status(200).json({
        preview: true,
        coach: {
          id: coach.id,
          name: `${coach.first_name} ${coach.last_name}`,
          email: coach.email
        },
        email: {
          type: email_type,
          variant,
          subject: emailContent.subject,
          html_length: emailContent.html.length
        },
        template_data: emailContent.templateData,
        html_content: emailContent.html
      });
    }

    // Return HTML format for browser preview
    const previewHtml = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Preview - ${email_type}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 20px; }
        .preview-header { 
          background: white; 
          padding: 20px; 
          border-radius: 8px; 
          margin-bottom: 20px; 
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .preview-header h2 { margin: 0 0 15px 0; color: #333; }
        .preview-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .info-item { background: #f8f9fa; padding: 10px; border-radius: 4px; }
        .info-label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
        .info-value { color: #333; margin-top: 5px; }
        .email-container { 
          max-width: 600px; 
          margin: 0 auto; 
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          border-radius: 8px;
          overflow: hidden;
        }
        .test-buttons {
          background: white;
          padding: 15px;
          text-align: center;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .test-button {
          background: #667eea;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          margin: 0 5px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
        }
        .test-button:hover { background: #5a6fd8; }
        .test-button.variant-b { background: #764ba2; }
      </style>
    </head>
    <body>
      <div class="preview-header">
        <h2>📧 Email Template Preview</h2>
        <div class="preview-info">
          <div class="info-item">
            <div class="info-label">Empfänger</div>
            <div class="info-value">${coach.first_name} ${coach.last_name}</div>
            <div class="info-value" style="color: #666; font-size: 14px;">${coach.email}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Email Type</div>
            <div class="info-value">${email_type}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Subject (Variant ${variant.toUpperCase()})</div>
            <div class="info-value">${emailContent.subject}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Trial Status</div>
            <div class="info-value">${emailContent.templateData.daysRemaining} Tage verbleibend</div>
          </div>
        </div>
      </div>

      <div class="test-buttons">
        <a href="?coach_id=${coach_id}&email_type=${email_type}&variant=a" class="test-button ${variant === 'a' ? 'active' : ''}">
          📧 Variant A Preview
        </a>
        <a href="?coach_id=${coach_id}&email_type=${email_type}&variant=b" class="test-button variant-b ${variant === 'b' ? 'active' : ''}">
          📧 Variant B Preview
        </a>
        <button onclick="sendTestEmail()" class="test-button" style="background: #28a745;">
          🚀 Send Test Email
        </button>
      </div>

      <div class="email-container">
        ${emailContent.html}
      </div>

      <script>
        async function sendTestEmail() {
          if (!confirm('Test Email senden an ${coach.email}?')) return;
          
          try {
            const response = await fetch('/api/email-sequence/send-manual', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                coach_id: ${coach_id},
                email_type: '${email_type}',
                variant: '${variant}',
                force: true
              })
            });
            
            const result = await response.json();
            
            if (result.success) {
              alert('✅ Test Email erfolgreich gesendet!');
            } else {
              alert('❌ Fehler: ' + result.message);
            }
          } catch (error) {
            alert('❌ Fehler beim Senden: ' + error.message);
          }
        }
      </script>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(previewHtml);

  } catch (error) {
    console.error('💥 Email preview error:', error);
    
    if (format === 'json') {
      return res.status(500).json({
        error: 'Failed to generate preview',
        message: error.message
      });
    }

    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send(`
      <h1>Preview Error</h1>
      <p>Failed to generate email preview: ${error.message}</p>
      <p><a href="/">← Back to Home</a></p>
    `);
  }
}