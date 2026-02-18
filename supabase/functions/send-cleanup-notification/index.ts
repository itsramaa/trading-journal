/**
 * Edge function to send email notification when trades are cleaned up
 * Called by the pg_cron cleanup job
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CleanupNotificationRequest {
  user_id: string;
  trades_deleted: number;
  retention_days: number;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { user_id, trades_deleted, retention_days }: CleanupNotificationRequest = await req.json();

    // Skip if no trades were deleted
    if (trades_deleted === 0) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "No trades deleted" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user email from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id);
    if (authError || !authUser?.user?.email) {
      console.error("Failed to get user:", authError);
      return new Response(
        JSON.stringify({ error: "User not found or no email" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = authUser.user.email;

    // Check user settings for email notifications
    const { data: settings } = await supabase
      .from("user_settings")
      .select("notify_email_enabled, notifications_enabled")
      .eq("user_id", user_id)
      .single();

    // If email notifications are disabled, skip
    if (settings && (!settings.notifications_enabled || !settings.notify_email_enabled)) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Email notifications disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user display name
    const { data: profile } = await supabase
      .from("users_profile")
      .select("display_name")
      .eq("user_id", user_id)
      .single();

    const displayName = profile?.display_name || userEmail.split("@")[0];

    // Calculate retention period text
    const retentionText = retention_days === 180 ? "6 months" 
      : retention_days === 365 ? "1 year" 
      : retention_days === 730 ? "2 years" 
      : `${retention_days} days`;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Trading Journal <noreply@lovable.app>",
      to: [userEmail],
      subject: `🧹 ${trades_deleted} Old Trade${trades_deleted > 1 ? 's' : ''} Cleaned Up`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🧹 Data Cleanup Complete</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${displayName},</p>
              
              <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px 20px; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0; font-weight: 600; color: #2e7d32;">
                  ${trades_deleted} Binance trade${trades_deleted > 1 ? 's' : ''} older than ${retentionText} ${trades_deleted > 1 ? 'have' : 'has'} been archived.
                </p>
              </div>
              
              <div style="background: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e0e0e0;">
                <h3 style="margin: 0 0 15px 0; color: #333; font-size: 14px; text-transform: uppercase;">Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666; border-bottom: 1px solid #eee;">Trades Archived</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; border-bottom: 1px solid #eee;">${trades_deleted}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; border-bottom: 1px solid #eee;">Retention Period</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; border-bottom: 1px solid #eee;">${retentionText}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Recovery Window</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">30 days</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #fff8e1; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px; color: #f57c00;">
                  <strong>💡 Note:</strong> Archived trades can be restored within 30 days from the Settings page.
                  After 30 days, they will be permanently deleted.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://demo-trade.lovable.app/settings" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  View Settings
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">
                You're receiving this because cleanup notifications are enabled in your settings.
                <br>
                To change your retention period, go to Settings → Exchange.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Cleanup notification email sent:", emailResponse);

    // Also create in-app notification
    await supabase
      .from("notifications")
      .insert({
        user_id,
        type: "system",
        title: `🧹 ${trades_deleted} Trade${trades_deleted > 1 ? 's' : ''} Archived`,
        message: `${trades_deleted} Binance trade${trades_deleted > 1 ? 's' : ''} older than ${retentionText} ${trades_deleted > 1 ? 'have' : 'has'} been archived. You can restore them within 30 days from Settings.`,
        read: false,
        metadata: { trades_deleted, retention_days },
      });

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending cleanup notification:", error);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
