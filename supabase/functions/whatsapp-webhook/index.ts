import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

interface WhatsAppMessage {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        contacts?: Array<{
          profile: {
            name: string
          }
          wa_id: string
        }>
        messages?: Array<{
          from: string
          id: string
          timestamp: string
          text?: {
            body: string
          }
          type: string
        }>
        statuses?: Array<{
          id: string
          status: string
          timestamp: string
          recipient_id: string
        }>
      }
      field: string
    }>
  }>
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const url = new URL(req.url)

    if (req.method === "GET") {
      const mode = url.searchParams.get("hub.mode")
      const token = url.searchParams.get("hub.verify_token")
      const challenge = url.searchParams.get("hub.challenge")

      const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "jatai_food_2025"

      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ Webhook verificado com sucesso!")
        return new Response(challenge, {
          status: 200,
          headers: corsHeaders,
        })
      } else {
        console.log("❌ Falha na verificação do webhook")
        return new Response("Forbidden", {
          status: 403,
          headers: corsHeaders,
        })
      }
    }

    if (req.method === "POST") {
      const body: WhatsAppMessage = await req.json()
      console.log("📨 Webhook recebido:", JSON.stringify(body, null, 2))

      if (body.object === "whatsapp_business_account") {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            const value = change.value

            if (value.messages && value.messages.length > 0) {
              for (const message of value.messages) {
                const from = message.from
                const messageBody = message.text?.body || ""
                const timestamp = parseInt(message.timestamp) * 1000
                const messageId = message.id

                const contactName = value.contacts?.[0]?.profile?.name || from

                console.log(`
                  📱 Nova mensagem recebida:
                  - De: ${contactName} (${from})
                  - Mensagem: ${messageBody}
                  - ID: ${messageId}
                `)

                const username = url.searchParams.get("username") || "A"

                const firebaseUrl = `https://ta-no-controle-default-rtdb.firebaseio.com/whatsapp_messages/${username}/${from}/${messageId}.json`

                const messageData = {
                  id: messageId,
                  from: from,
                  to: value.metadata.phone_number_id,
                  body: messageBody,
                  timestamp: timestamp,
                  isFromCustomer: true,
                  status: "delivered",
                  customerName: contactName,
                }

                const response = await fetch(firebaseUrl, {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(messageData),
                })

                if (response.ok) {
                  console.log("✅ Mensagem salva no Firebase")
                } else {
                  console.error("❌ Erro ao salvar no Firebase:", await response.text())
                }

                const geminiApiKey = Deno.env.get("GEMINI_API_KEY")
                if (geminiApiKey) {
                  console.log("🤖 Processando com IA...")

                  const aiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        contents: [{
                          parts: [{
                            text: `Você é um atendente de restaurante. Responda de forma amigável e profissional: "${messageBody}"`
                          }]
                        }]
                      }),
                    }
                  )

                  if (aiResponse.ok) {
                    const aiData = await aiResponse.json()
                    const reply = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não entendi."

                    console.log("🤖 Resposta da IA:", reply)

                    const whatsappToken = Deno.env.get("WHATSAPP_TOKEN")
                    const phoneNumberId = value.metadata.phone_number_id

                    if (whatsappToken) {
                      const sendResponse = await fetch(
                        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
                        {
                          method: "POST",
                          headers: {
                            "Authorization": `Bearer ${whatsappToken}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            messaging_product: "whatsapp",
                            to: from,
                            text: { body: reply },
                          }),
                        }
                      )

                      if (sendResponse.ok) {
                        console.log("✅ Resposta enviada via WhatsApp")
                      }
                    }
                  }
                }
              }
            }

            if (value.statuses && value.statuses.length > 0) {
              for (const status of value.statuses) {
                console.log(`📊 Status atualizado: ${status.id} - ${status.status}`)
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      })
    }

    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    })

  } catch (error) {
    console.error("❌ Erro no webhook:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    })
  }
})
