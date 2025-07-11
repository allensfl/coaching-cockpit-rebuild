// ========================================
// EMAIL SEQUENCE API IMPLEMENTATION
// File: api/email-sequence/send.js
// ========================================

const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const { generateEmail } = require('../../lib/emailTemplates');

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Main API handler for sending email sequence emails
 * Can be called manually or via cron job
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get coaches ready for email sequence
    const { data: coaches, error: coachError } = await supabase
      .rpc('get_coaches_for_email_sequence');

    if (coachError) {
      console.error('Error fetching coaches:', coachError);
      return res.status(500).json({ error: 'Database error', details: coachError });
    }

    if (!coaches || coaches.length === 0) {
      return res.status(200).json({ 
        message: 'No coaches ready for email sequence',
        processed: 0 
      });
    }

    console.log(`Processing ${coaches.length} coaches for email sequence`);

    const results = [];

    // Process each coach
    for (const coach of coaches) {
      try {
        const result = await sendSequenceEmail(coach);
        results.push(result);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error processing coach ${coach.coach_id}:`, error);
        results.push({
          coach_id: coach.coach_id,
          email: coach.email,
          email_type: coach.next_email_type,
          success: false,
          error: error.message
        });
      }
    }

    // Summary response
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return res.status(200).json({
      message: 'Email sequence processing complete',
      processed: coaches.length,
      successful,
      failed,
      results
    });

  } catch (error) {
    console.error('Email sequence API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Send individual sequence email to a coach
 */
async function sendSequenceEmail(coach) {
  const emailType = coach.next_email_type;
  
  if (!emailType) {
    throw new Error('No email type specified');
  }

  // Check if email was already sent (safety check)
  const { data: existingEmail } = await supabase
    .from('email_sequence_log')
    .select('id')
    .eq('coach_id', coach.coach_id)
    .eq('email_type', emailType)
    .single();

  if (existingEmail) {
    throw new Error(`Email ${emailType} already sent to coach ${coach.coach_id}`);
  }

  // Get A/B testing variant
  const variant = Math.random() < 0.5 ? 'a' : 'b';

  // Generate email content
  const emailContent = generateEmail(coach, emailType, { variant });

  // Send email via Resend
  const emailResponse = await resend.emails.send({
    from: 'KI-Coaching <noreply@ki-online.coach>', // Will use @resend.dev until domain is verified
    to: coach.email,
    subject: emailContent.subject,
    html: emailContent.html
  });

  if (emailResponse.error) {
    throw new Error(`Resend error: ${emailResponse.error.message}`);
  }

  // Log email in database
  const { error: logError } = await supabase
    .from('email_sequence_log')
    .insert({
      coach_id: coach.coach_id,
      email_type: emailType,
      subject_line: emailContent.subject,
      email_html: emailContent.html,
      status: 'sent',
      resend_email_id: emailResponse.data?.id
    });

  if (logError) {
    console.error('Error logging email:', logError);
    // Don't throw - email was sent successfully
  }

  // Update coach's last email sent
  await supabase
    .from('coaches')
    .update({
      last_email_sent: emailType,
      last_email_sent_at: new Date().toISOString()
    })
    .eq('id', coach.coach_id);

  return {
    coach_id: coach.coach_id,
    email: coach.email,
    email_type: emailType,
    subject: emailContent.subject,
    variant,
    resend_id: emailResponse.data?.id,
    success: true
  };
}

// ========================================
// MANUAL EMAIL SENDER API
// File: api/email-sequence/send-manual.js
// ========================================

/**
 * Manual email sender for testing individual emails
 * Usage: POST /api/email-sequence/send-manual
 * Body: { coach_id: 7, email_type: 'day1_checkin' }
 */
export async function sendManualEmail(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { coach_id, email_type, variant = 'a' } = req.body;

  if (!coach_id || !email_type) {
    return res.status(400).json({ 
      error: 'Missing required fields: coach_id, email_type' 
    });
  }

  try {
    // Get coach data
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('*')
      .eq('id', coach_id)
      .single();

    if (coachError || !coach) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    // Generate email
    const emailContent = generateEmail(coach, email_type, { variant });

    // Send email
    const emailResponse = await resend.emails.send({
      from: 'KI-Coaching <noreply@ki-online.coach>',
      to: coach.email,
      subject: emailContent.subject,
      html: emailContent.html
    });

    if (emailResponse.error) {
      throw new Error(`Resend error: ${emailResponse.error.message}`);
    }

    // Log email
    await supabase
      .from('email_sequence_log')
      .insert({
        coach_id: coach.id,
        email_type,
        subject_line: emailContent.subject,
        email_html: emailContent.html,
        status: 'sent',
        resend_email_id: emailResponse.data?.id
      });

    return res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      coach: {
        id: coach.id,
        name: `${coach.first_name} ${coach.last_name}`,
        email: coach.email
      },
      email: {
        type: email_type,
        subject: emailContent.subject,
        variant,
        resend_id: emailResponse.data?.id
      }
    });

  } catch (error) {
    console.error('Manual email send error:', error);
    return res.status(500).json({
      error: 'Failed to send email',
      message: error.message
    });
  }
}

// ========================================
// EMAIL PREVIEW API
// File: api/email-sequence/preview.js
// ========================================

/**
 * Preview email templates without sending
 * Usage: GET /api/email-sequence/preview?coach_id=7&email_type=day1_checkin&variant=a
 */
export async function previewEmail(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { coach_id, email_type, variant = 'a' } = req.query;

  if (!coach_id || !email_type) {
    return res.status(400).json({ 
      error: 'Missing required parameters: coach_id, email_type' 
    });
  }

  try {
    // Get coach data
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('*')
      .eq('id', coach_id)
      .single();

    if (coachError || !coach) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    // Generate email content
    const emailContent = generateEmail(coach, email_type, { variant });

    // Return HTML for preview
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`
      <div style="background: #f0f0f0; padding: 20px;">
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3>Email Preview</h3>
          <p><strong>To:</strong> ${coach.email}</p>
          <p><strong>Subject:</strong> ${emailContent.subject}</p>
          <p><strong>Type:</strong> ${email_type}</p>
          <p><strong>Variant:</strong> ${variant}</p>
        </div>
        ${emailContent.html}
      </div>
    `);

  } catch (error) {
    console.error('Email preview error:', error);
    return res.status(500).json({
      error: 'Failed to generate preview',
      message: error.message
    });
  }
}

// ========================================
// CRON JOB SETUP INSTRUCTIONS
// ========================================

/*
VERCEL CRON JOB SETUP:

1. Create vercel.json in project root:
{
  "crons": [
    {
      "path": "/api/email-sequence/send",
      "schedule": "0 10 * * *"
    }
  ]
}

2. Or use external cron service (cron-job.org):
- URL: https://your-domain.vercel.app/api/email-sequence/send
- Schedule: Daily at 10:00 AM
- Method: POST

3. For testing, call manually:
curl -X POST https://your-domain.vercel.app/api/email-sequence/send

4. Preview emails:
https://your-domain.vercel.app/api/email-sequence/preview?coach_id=7&email_type=day1_checkin

5. Send manual test emails:
curl -X POST https://your-domain.vercel.app/api/email-sequence/send-manual \
  -H "Content-Type: application/json" \
  -d '{"coach_id": 7, "email_type": "day1_checkin", "variant": "a"}'
*/