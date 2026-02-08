import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SyncFailureEmailRequest {
  failureCount: number;
  lastError: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email
    const userEmail = user.email;
    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "No email associated with user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user settings for email notifications
    const { data: settings } = await supabase
      .from("user_settings")
      .select("notify_email_enabled, notifications_enabled")
      .eq("user_id", user.id)
      .single();

    // If email notifications are disabled, skip
    if (settings && (!settings.notifications_enabled || !settings.notify_email_enabled)) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Email notifications disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { failureCount, lastError }: SyncFailureEmailRequest = await req.json();

    // Get user display name
    const { data: profile } = await supabase
      .from("users_profile")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    const displayName = profile?.display_name || userEmail.split("@")[0];

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Trading Journal <noreply@lovable.app>",
      to: [userEmail],
      subject: `🔴 Binance Sync Failed ${failureCount} Times`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚠️ Sync Alert</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${displayName},</p>
              
              <div style="background: #fff3f3; border-left: 4px solid #dc3545; padding: 15px 20px; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0; font-weight: 600; color: #dc3545;">
                  Your Binance sync has failed ${failureCount} times consecutively.
                </p>
              </div>
              
              <div style="background: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e0e0e0;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 14px; text-transform: uppercase;">Last Error</h3>
                <p style="margin: 0; color: #666; font-family: monospace; font-size: 13px; word-break: break-all;">
                  ${lastError}
                </p>
              </div>
              
              <h3 style="margin: 20px 0 10px 0; color: #333; font-size: 16px;">Suggested Actions:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #555;">
                <li style="margin-bottom: 8px;">Verify your Binance API credentials are still valid</li>
                <li style="margin-bottom: 8px;">Check if your API key has the required permissions (Read-Only Futures)</li>
                <li style="margin-bottom: 8px;">Ensure your IP is whitelisted in Binance API settings</li>
                <li style="margin-bottom: 8px;">Try running a manual sync from Settings → Exchange</li>
              </ul>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://demo-trade.lovable.app/settings" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  Check Settings
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">
                You're receiving this because sync failure notifications are enabled in your settings.
                <br>
                To disable, go to Settings → Notifications.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Sync failure email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending sync failure email:", error);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
