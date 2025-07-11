// ========================================
// FILE: api/email-sequence/send-manual.js
// Manual Email Sender for Testing
// ========================================

const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const { generateEmail } = require('../../lib/emailTemplates');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { coach_id, email_type, variant = 'a', force = false } = req.body;

  if (!coach_id || !email_type) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['coach_id', 'email_type'],
      received: { coach_id, email_type }
    });
  }

  try {
    console.log(`🎯 Manual email send: ${email_type} to coach ${coach_id} (variant: ${variant})`);

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

    console.log(`👤 Found coach: ${coach.first_name} ${coach.last_name} (${coach.email})`);

    // Check if email was already sent (unless forced)
    if (!force) {
      const { data: existingEmail } = await supabase
        .from('email_sequence_log')
        .select('id, sent_at')
        .eq('coach_id', coach_id)
        .eq('email_type', email_type)
        .single();

      if (existingEmail) {
        return res.status(409).json({
          error: 'Email already sent',
          message: `Email ${email_type} was already sent to this coach`,
          sent_at: existingEmail.sent_at,
          tip: 'Use force=true to send anyway'
        });
      }
    }

    // Generate email content
    const emailContent = generateEmail(coach, email_type, { variant });
    
    console.log(`📧 Generated email: "${emailContent.subject}"`);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: 'KI-Coaching <noreply@resend.dev>',
      to: coach.email,
      subject: emailContent.subject,
      html: emailContent.html
    });

    if (emailResponse.error) {
      console.error('❌ Resend error:', emailResponse.error);
      throw new Error(`Resend error: ${emailResponse.error.message}`);
    }

    console.log(`✅ Email sent via Resend: ${emailResponse.data?.id}`);

    // Log email in database
    const { data: logData, error: logError } = await supabase
      .from('email_sequence_log')
      .insert({
        coach_id: coach.id,
        email_type,
        subject_line: emailContent.subject,
        email_html: emailContent.html,
        status: 'sent',
        resend_email_id: emailResponse.data?.id
      })
      .select()
      .single();

    if (logError) {
      console.error('⚠️ Error logging email:', logError);
    } else {
      console.log(`📝 Email logged in database: ID ${logData.id}`);
    }

    // Update coach's last email sent
    const { error: updateError } = await supabase
      .from('coaches')
      .update({
        last_email_sent: email_type,
        last_email_sent_at: new Date().toISOString()
      })
      .eq('id', coach.id);

    if (updateError) {
      console.error('⚠️ Error updating coach:', updateError);
    }

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
        resend_id: emailResponse.data?.id,
        sent_at: new Date().toISOString()
      },
      database: {
        logged: !logError,
        log_id: logData?.id
      }
    });

  } catch (error) {
    console.error('💥 Manual email send error:', error);
    return res.status(500).json({
      error: 'Failed to send email',
      message: error.message,
      coach_id,
      email_type
    });
  }
}