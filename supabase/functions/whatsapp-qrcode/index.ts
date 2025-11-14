import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { action, instance, apiUrl, apiKey } = await req.json();

    if (!apiUrl || !apiKey) {
      throw new Error('API URL e API Key são obrigatórias');
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': apiKey,
    };

    if (action === 'create') {
      const createResponse = await fetch(`${apiUrl}/instance/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          instanceName: instance,
          qrcode: true,
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Erro ao criar instância');
      }

      const createData = await createResponse.json();

      return new Response(
        JSON.stringify({
          success: true,
          data: createData,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (action === 'connect') {
      const connectResponse = await fetch(`${apiUrl}/instance/connect/${instance}`, {
        method: 'GET',
        headers,
      });

      if (!connectResponse.ok) {
        throw new Error('Erro ao conectar instância');
      }

      const connectData = await connectResponse.json();

      return new Response(
        JSON.stringify({
          success: true,
          qrCode: connectData.base64 || connectData.code,
          pairingCode: connectData.pairingCode,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (action === 'status') {
      const statusResponse = await fetch(`${apiUrl}/instance/connectionState/${instance}`, {
        method: 'GET',
        headers,
      });

      if (!statusResponse.ok) {
        throw new Error('Erro ao verificar status');
      }

      const statusData = await statusResponse.json();

      return new Response(
        JSON.stringify({
          success: true,
          status: statusData.state,
          connected: statusData.state === 'open',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (action === 'logout') {
      const logoutResponse = await fetch(`${apiUrl}/instance/logout/${instance}`, {
        method: 'DELETE',
        headers,
      });

      if (!logoutResponse.ok) {
        throw new Error('Erro ao desconectar');
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Desconectado com sucesso',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    throw new Error('Ação inválida');

  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
