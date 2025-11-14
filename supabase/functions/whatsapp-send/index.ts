import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendMessageRequest {
  tenantId: string;
  to: string;
  message: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { tenantId, to, message }: SendMessageRequest = await req.json();

    if (!tenantId || !to || !message) {
      return new Response(
        JSON.stringify({ error: "Parâmetros faltando" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const firebaseUrl = `https://ta-no-controle-default-rtdb.firebaseio.com/whatsapp_config/${tenantId}.json`;
    const configResponse = await fetch(firebaseUrl);

    if (!configResponse.ok) {
      throw new Error("Configuração não encontrada");
    }

    const config = await configResponse.json();

    if (!config || !config.accessToken || !config.phoneNumberId) {
      return new Response(
        JSON.stringify({ error: "WhatsApp não configurado" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const whatsappApiUrl = `https://graph.facebook.com/v17.0/${config.phoneNumberId}/messages`;

    const whatsappResponse = await fetch(whatsappApiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/\D/g, ''),
        type: "text",
        text: {
          body: message,
        },
      }),
    });

    if (!whatsappResponse.ok) {
      const errorData = await whatsappResponse.json();
      console.error("Erro WhatsApp API:", errorData);
      throw new Error(errorData.error?.message || "Erro ao enviar mensagem");
    }

    const result = await whatsappResponse.json();

    return new Response(
      JSON.stringify({ success: true, messageId: result.messages[0].id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
