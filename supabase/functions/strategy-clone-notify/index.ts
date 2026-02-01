import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CloneNotifyRequest {
  strategyId: string;
  strategyName: string;
  ownerUserId: string;
  clonerDisplayName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { strategyId, strategyName, ownerUserId, clonerDisplayName }: CloneNotifyRequest = await req.json();

    // Validate required fields
    if (!strategyId || !strategyName || !ownerUserId) {
      throw new Error("Missing required fields");
    }

    // Get owner's email from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(ownerUserId);
    
    if (userError || !userData?.user?.email) {
      console.log("Could not get owner email:", userError?.message || "No email found");
      return new Response(
        JSON.stringify({ success: false, reason: "Owner email not found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const ownerEmail = userData.user.email;

    // Check if owner has email notifications enabled
    const { data: settings } = await supabase
      .from("user_settings")
      .select("notifications_enabled, notify_email_enabled")
      .eq("user_id", ownerUserId)
      .single();

    if (settings && (!settings.notifications_enabled || !settings.notify_email_enabled)) {
      console.log("Owner has email notifications disabled");
      return new Response(
        JSON.stringify({ success: false, reason: "Email notifications disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send notification email
    const emailResponse = await resend.emails.send({
      from: "Trading Journey <notifications@resend.dev>",
      to: [ownerEmail],
      subject: `🎉 Your strategy "${strategyName}" was cloned!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Strategy Cloned! 🚀</h1>
            </div>
            <div style="padding: 32px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                Great news! Your trading strategy has been cloned by another trader.
              </p>
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Strategy:</td>
                    <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${strategyName}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Cloned by:</td>
                    <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${clonerDisplayName || "A fellow trader"}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Date:</td>
                    <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                  </tr>
                </table>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                Your strategy is helping other traders improve their performance. Keep sharing your knowledge! 📈
              </p>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                You received this email because you have sharing enabled for your strategy.
                <br>Manage your notification preferences in Settings.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Clone notification email sent:", emailResponse);

    // Atomically increment clone count using RPC function
    // This prevents race conditions when multiple users clone simultaneously
    const { error: rpcError } = await supabase.rpc("increment_clone_count", {
      p_strategy_id: strategyId,
    });

    if (rpcError) {
      console.error("Failed to increment clone count:", rpcError.message);
      // Don't throw - email was already sent, just log the error
    }

    // Also create in-app notification
    await supabase.from("notifications").insert({
      user_id: ownerUserId,
      type: "strategy_clone",
      title: "Strategy Cloned!",
      message: `Your strategy "${strategyName}" was cloned by ${clonerDisplayName || "another trader"}.`,
      metadata: { strategyId, clonerDisplayName },
    });

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in strategy-clone-notify:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
