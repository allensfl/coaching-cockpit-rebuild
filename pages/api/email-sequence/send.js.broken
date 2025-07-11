// ========================================
// FILE: api/email-sequence/send.js
// Automated Email Sequence Sender
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Starting email sequence processing...');

    // Get coaches ready for email sequence
    const { data: coaches, error: coachError } = await supabase
      .rpc('get_coaches_for_email_sequence');

    if (coachError) {
      console.error('❌ Error fetching coaches:', coachError);
      return res.status(500).json({ error: 'Database error', details: coachError.message });
    }

    if (!coaches || coaches.length === 0) {
      console.log('ℹ️ No coaches ready for email sequence');
      return res.status(200).json({ 
        message: 'No coaches ready for email sequence',
        processed: 0 
      });
    }

    console.log(`📧 Processing ${coaches.length} coaches for email sequence`);

    const results = [];

    // Process each coach
    for (const coach of coaches) {
      try {
        console.log(`Processing coach: ${coach.first_name} ${coach.last_name} (${coach.email}) - ${coach.next_email_type}`);
        
        const result = await sendSequenceEmail(coach);
        results.push(result);
        
        console.log(`✅ Email sent successfully to ${coach.email}`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Error processing coach ${coach.coach_id}:`, error);
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

    console.log(`📊 Email sequence complete: ${successful} successful, ${failed} failed`);

    return res.status(200).json({
      message: 'Email sequence processing complete',
      processed: coaches.length,
      successful,
      failed,
      results
    });

  } catch (error) {
    console.error('💥 Email sequence API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

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
    from: 'KI-Coaching <noreply@resend.dev>', // Will change to @ki-online.coach after domain verification
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
    console.error('⚠️ Error logging email (email was sent):', logError);
  }

  // Update coach's last email sent
  const { error: updateError } = await supabase
    .from('coaches')
    .update({
      last_email_sent: emailType,
      last_email_sent_at: new Date().toISOString()
    })
    .eq('id', coach.coach_id);

  if (updateError) {
    console.error('⚠️ Error updating coach (email was sent):', updateError);
  }

  return {
    coach_id: coach.coach_id,
    email: coach.email,
    email_type: emailType,
    subject: emailContent.subject,
    variant,
    resend_id: emailResponse.data?.id,
    success: true,
    sent_at: new Date().toISOString()
  };
}