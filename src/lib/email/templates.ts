/**
 * Email template utilities for Business Discovery system
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Template 1: Initial Invitation
 * Sent when a business is first discovered and qualified
 */
export function initialInvitation(
  businessName: string,
  serviceCategory: string,
  rating: number,
  city: string,
  signupLink: string
): EmailTemplate {
  const subject = `Exclusive invite: Join LeadFlip for qualified leads in ${city}`;

  const text = `Hi ${businessName},

We found your ${serviceCategory} business on Google (${rating} stars - impressive!) and think you'd be perfect for LeadFlip.

LeadFlip connects local service businesses like yours with customers who need help right now. No bidding wars, no fake leads - just qualified customers ready to hire.

Why businesses in ${city} are joining:
• Pay only for leads you want
• AI pre-qualifies customers before you're matched
• Get notified instantly via SMS/email
• Average response time: under 15 minutes

Your profile is pre-filled - it takes 2 minutes to activate:
${signupLink}

Questions? Reply to this email.

Best,
The LeadFlip Team

P.S. We're launching in ${city} this month. Early businesses get 50% off their first 5 leads.`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join LeadFlip</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
    <h2 style="color: #2563eb; margin-top: 0;">Hi ${businessName},</h2>

    <p>We found your <strong>${serviceCategory}</strong> business on Google (<strong>${rating} stars</strong> - impressive!) and think you'd be perfect for LeadFlip.</p>

    <p>LeadFlip connects local service businesses like yours with customers who need help right now. No bidding wars, no fake leads - just qualified customers ready to hire.</p>

    <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <h3 style="color: #1e293b; margin-top: 0;">Why businesses in ${city} are joining:</h3>
      <ul style="list-style: none; padding-left: 0;">
        <li style="padding: 8px 0;">✅ Pay only for leads you want</li>
        <li style="padding: 8px 0;">✅ AI pre-qualifies customers before you're matched</li>
        <li style="padding: 8px 0;">✅ Get notified instantly via SMS/email</li>
        <li style="padding: 8px 0;">✅ Average response time: under 15 minutes</li>
      </ul>
    </div>

    <p style="margin: 30px 0;">Your profile is pre-filled - it takes 2 minutes to activate:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${signupLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Activate Your Profile</a>
    </div>

    <p>Questions? Reply to this email.</p>

    <p style="margin-top: 30px;">Best,<br><strong>The LeadFlip Team</strong></p>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #64748b;">
      <p style="margin: 0;"><strong>P.S.</strong> We're launching in ${city} this month. Early businesses get <strong>50% off their first 5 leads</strong>.</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

/**
 * Template 2: Follow-Up 1 (Day 3)
 * First gentle reminder after initial invitation
 */
export function followUp1(
  businessName: string,
  serviceCategory: string,
  signupLink: string
): EmailTemplate {
  const subject = `Following up: ${businessName} + LeadFlip`;

  const text = `Hi ${businessName},

I wanted to follow up on the invitation I sent a few days ago about joining LeadFlip.

We're helping ${serviceCategory} businesses in your area connect with customers who are actively searching for help. Since you're highly rated on Google, we think you'd be a great fit.

Quick reminder of what you get:
• Only pay for leads you accept
• AI screens customers for quality before matching
• Instant notifications when a lead matches your criteria
• No long-term contracts or monthly fees

Your pre-filled profile is ready:
${signupLink}

Let me know if you have any questions.

Best,
The LeadFlip Team`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Following up: Join LeadFlip</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
    <h2 style="color: #2563eb; margin-top: 0;">Hi ${businessName},</h2>

    <p>I wanted to follow up on the invitation I sent a few days ago about joining LeadFlip.</p>

    <p>We're helping <strong>${serviceCategory}</strong> businesses in your area connect with customers who are actively searching for help. Since you're highly rated on Google, we think you'd be a great fit.</p>

    <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <h3 style="color: #1e293b; margin-top: 0;">Quick reminder of what you get:</h3>
      <ul style="list-style: none; padding-left: 0;">
        <li style="padding: 8px 0;">✅ Only pay for leads you accept</li>
        <li style="padding: 8px 0;">✅ AI screens customers for quality before matching</li>
        <li style="padding: 8px 0;">✅ Instant notifications when a lead matches your criteria</li>
        <li style="padding: 8px 0;">✅ No long-term contracts or monthly fees</li>
      </ul>
    </div>

    <p style="margin: 30px 0;">Your pre-filled profile is ready:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${signupLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Get Started Now</a>
    </div>

    <p>Let me know if you have any questions.</p>

    <p style="margin-top: 30px;">Best,<br><strong>The LeadFlip Team</strong></p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

/**
 * Template 3: Follow-Up 2 (Day 7)
 * More urgent reminder highlighting scarcity
 */
export function followUp2(
  businessName: string,
  serviceCategory: string,
  signupLink: string
): EmailTemplate {
  const subject = `Last call: Exclusive leads for ${businessName}`;

  const text = `Hi ${businessName},

This is my last email about LeadFlip - I don't want to keep bothering you!

But I did want to let you know that we're close to capacity for ${serviceCategory} businesses in your area. We limit the number of businesses per category to ensure everyone gets quality leads.

What you're missing out on:
• Pre-qualified customers who need ${serviceCategory} services now
• Zero upfront cost - pay only when you accept a lead
• AI handles initial screening so you talk to serious customers only
• Average lead value: $300-$800 for ${serviceCategory} jobs

If you're interested, claim your spot today:
${signupLink}

If not, no worries - I'll remove you from our list.

Best,
The LeadFlip Team`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Last call: Join LeadFlip</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
    <h2 style="color: #2563eb; margin-top: 0;">Hi ${businessName},</h2>

    <p>This is my last email about LeadFlip - I don't want to keep bothering you!</p>

    <p>But I did want to let you know that we're close to capacity for <strong>${serviceCategory}</strong> businesses in your area. We limit the number of businesses per category to ensure everyone gets quality leads.</p>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <h3 style="color: #92400e; margin-top: 0;">What you're missing out on:</h3>
      <ul style="list-style: none; padding-left: 0; color: #78350f;">
        <li style="padding: 8px 0;">📋 Pre-qualified customers who need ${serviceCategory} services now</li>
        <li style="padding: 8px 0;">💰 Zero upfront cost - pay only when you accept a lead</li>
        <li style="padding: 8px 0;">🤖 AI handles initial screening so you talk to serious customers only</li>
        <li style="padding: 8px 0;">💵 Average lead value: $300-$800 for ${serviceCategory} jobs</li>
      </ul>
    </div>

    <p style="margin: 30px 0;">If you're interested, claim your spot today:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${signupLink}" style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Claim Your Spot</a>
    </div>

    <p>If not, no worries - I'll remove you from our list.</p>

    <p style="margin-top: 30px;">Best,<br><strong>The LeadFlip Team</strong></p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

/**
 * Template 4: Follow-Up 3 (Day 14)
 * Final breakup email with unsubscribe confirmation
 */
export function followUp3(
  businessName: string,
  signupLink: string
): EmailTemplate {
  const subject = `We'll remove ${businessName} from our list`;

  const text = `Hi ${businessName},

I haven't heard back, so I'll remove you from our invitation list.

If you change your mind, you can still activate your account here:
${signupLink}

Thanks for your time, and best of luck with your business!

Best,
The LeadFlip Team

P.S. If you know another business owner who might be interested in quality leads, feel free to forward this email.`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Removing from list</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
    <h2 style="color: #64748b; margin-top: 0;">Hi ${businessName},</h2>

    <p>I haven't heard back, so I'll remove you from our invitation list.</p>

    <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px dashed #cbd5e1;">
      <p style="margin: 0;">If you change your mind, you can still activate your account here:</p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${signupLink}" style="display: inline-block; background-color: #64748b; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 15px;">Activate Account</a>
      </div>
    </div>

    <p>Thanks for your time, and best of luck with your business!</p>

    <p style="margin-top: 30px;">Best,<br><strong>The LeadFlip Team</strong></p>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #64748b;">
      <p style="margin: 0;"><strong>P.S.</strong> If you know another business owner who might be interested in quality leads, feel free to forward this email.</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

/**
 * Helper function to generate signup link with tracking parameters
 */
export function generateSignupLink(
  prospectId: string,
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'
): string {
  return `${baseUrl}/business/signup?prospect=${prospectId}&source=email`;
}
