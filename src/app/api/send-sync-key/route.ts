import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * API Route: Send Sync Key via Email
 *
 * This endpoint sends a user's sync key to their email address using Resend.
 *
 * SETUP INSTRUCTIONS:
 * -------------------
 * 1. Install Resend package:
 *    npm install resend
 *
 * 2. Sign up for Resend account at https://resend.com
 *
 * 3. Add API key to your .env.local:
 *    RESEND_API_KEY=re_...
 *
 * 4. Verify your domain in Resend dashboard (optional but recommended for production):
 *    - Add DNS records to your domain
 *    - Use verified domain as "from" address
 *    - For testing, you can use onboarding@resend.dev
 *
 * 5. Update .env.example:
 *    Add: RESEND_API_KEY=re_your-api-key-here
 *
 * RATE LIMITING:
 * --------------
 * Consider implementing rate limiting to prevent abuse:
 * - Option 1: Use Vercel Edge Config + KV for rate limiting
 * - Option 2: Use Upstash Redis for rate limiting
 * - Option 3: Track requests in Supabase with user_id/IP
 *
 * Example rate limit: 3 emails per IP per hour
 */

// Validation schema
const SendSyncKeySchema = z.object({
  email: z.string().email("Invalid email address"),
  syncKey: z.string().min(16, "Invalid sync key").max(16, "Invalid sync key"),
});

// Email template
function generateEmailHTML(syncKey: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your beta.rocks Sync Key</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">beta.rocks</h1>
    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Your Sync Key</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="margin-top: 0;">Here's your beta.rocks sync key:</p>

    <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #667eea; margin: 20px 0;">
      <code style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #667eea; word-break: break-all;">${syncKey}</code>
    </div>

    <p style="margin-bottom: 10px;"><strong>Save this key somewhere safe.</strong> You'll need it to sync your favorites, reports, and votes across devices.</p>

    <h2 style="color: #667eea; font-size: 20px; margin-top: 30px;">How to Sync Another Device</h2>

    <ol style="padding-left: 20px;">
      <li style="margin-bottom: 10px;">Visit <a href="https://beta.rocks/sync" style="color: #667eea; text-decoration: none;">beta.rocks/sync</a></li>
      <li style="margin-bottom: 10px;">Enter your sync key</li>
      <li style="margin-bottom: 10px;">Your data will be restored instantly</li>
    </ol>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666;">
      <p style="margin: 5px 0;"><strong>Note:</strong> This email was sent at your request. We never store your email address.</p>
      <p style="margin: 5px 0;">If you didn't request this sync key, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function generateEmailText(syncKey: string): string {
  return `
Here's your beta.rocks sync key:

${syncKey}

Save this key somewhere safe. You'll need it to sync your favorites, reports, and votes across devices.

To sync another device:
1. Visit https://beta.rocks/sync
2. Enter this sync key
3. Your data will be restored instantly

---
Note: This email was sent at your request. We never store your email address.
If you didn't request this sync key, you can safely ignore this email.
  `.trim();
}

/**
 * POST /api/send-sync-key
 *
 * Sends a sync key to the provided email address.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = SendSyncKeySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, syncKey } = validation.data;

    // Check if Resend is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return NextResponse.json(
        {
          error:
            "Email service not configured. Please contact support or save your sync key manually.",
        },
        { status: 503 }
      );
    }

    // RATE LIMITING CHECK (IMPLEMENT THIS!)
    // Example: Check if this IP has sent more than 3 emails in the last hour
    // const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
    // const rateLimitExceeded = await checkRateLimit(clientIp);
    // if (rateLimitExceeded) {
    //   return NextResponse.json(
    //     { error: "Too many requests. Please try again later." },
    //     { status: 429 }
    //   );
    // }

    // Import Resend dynamically to avoid errors if not installed
    let Resend: any;
    try {
      // @ts-ignore - Resend package is optional and installed separately
      const resendModule = await import("resend");
      Resend = resendModule.Resend;
    } catch (error) {
      console.error("Resend package not installed:", error);
      return NextResponse.json(
        {
          error:
            "Email service not available. Please install the resend package.",
        },
        { status: 503 }
      );
    }

    // Initialize Resend client
    const resend = new Resend(resendApiKey);

    // Send email
    const { data, error } = await resend.emails.send({
      from: "beta.rocks <noreply@beta.rocks>", // Change this to your verified domain
      // For testing without verified domain, use: "onboarding@resend.dev"
      to: email,
      subject: "Your beta.rocks Sync Key",
      html: generateEmailHTML(syncKey),
      text: generateEmailText(syncKey),
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send email. Please try again." },
        { status: 500 }
      );
    }

    console.log("Sync key email sent successfully:", data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending sync key email:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
