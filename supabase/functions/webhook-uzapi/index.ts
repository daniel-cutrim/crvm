// @ts-nocheck - This file runs in Deno runtime (Supabase Edge Functions), not Node.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseWebhookMessage, formatPhone, getUzapiBaseConfig, uzapiUrl, uzapiHeaders, downloadAndUploadMediaDetailed } from "../_shared/uzapi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok");
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const rawPayload = await req.json();

    // UZAPI may wrap the WhatsApp payload inside a "body" key (or send as array)
    let payload: Record<string, unknown>;
    if (Array.isArray(rawPayload)) {
      const first = rawPayload[0] as Record<string, unknown>;
      payload = (first?.body ?? first) as Record<string, unknown>;
    } else if (rawPayload?.body && typeof rawPayload.body === "object") {
      payload = rawPayload.body as Record<string, unknown>;
    } else {
      payload = rawPayload;
    }

    const parsed = parseWebhookMessage(payload);

    if (!parsed) {
      console.log("webhook-uzapi: ignored payload, object=", payload?.object);
      return new Response(JSON.stringify({ status: "ignored" }), { status: 200 });
    }

    console.log("webhook-uzapi: parsed type=", parsed.type, "phoneNumberId=", parsed.phoneNumberId);

    // --- Handle QR code events (no tenant lookup needed) ---
    if (parsed.type === "qrcode") {
      if (parsed.qrCode && parsed.phoneNumberId) {
        const { data: integ, error: integError } = await supabaseClient
          .from("integracoes")
          .select("id, credentials")
          .eq("tipo", "uzapi")
          .filter("credentials->>phoneNumberId", "eq", parsed.phoneNumberId)
          .maybeSingle();

        console.log("webhook-uzapi qrcode: integ found=", !!integ, "error=", integError?.message);

        if (integ) {
          const updatedCreds = { ...(integ.credentials as Record<string, unknown>), qr_code: parsed.qrCode };
          const { error: updateError } = await supabaseClient
            .from("integracoes")
            .update({ credentials: updatedCreds })
            .eq("id", integ.id);
          console.log("webhook-uzapi qrcode: update error=", updateError?.message);
        }
      }
      return new Response(JSON.stringify({ status: "qrcode_saved" }), { status: 200 });
    }

    // For all other events, find the tenant
    const { data: integracao } = await supabaseClient
      .from("integracoes")
      .select("id, clinica_id, setor_id, credentials")
      .eq("tipo", "uzapi")
      .filter("credentials->>phoneNumberId", "eq", parsed.phoneNumberId)
      .maybeSingle();

    if (!integracao) {
      console.warn("webhook-uzapi: phoneNumberId not found:", parsed.phoneNumberId);
      return new Response(JSON.stringify({ error: "Instance unmanaged" }), { status: 200 });
    }

    const { clinica_id, setor_id } = integracao;
    const creds = integracao.credentials as Record<string, unknown>;

    // --- Handle connection events ---
    if (parsed.type === "connection") {
      console.log(`webhook-uzapi connection: ${parsed.phoneNumberId} -> ${parsed.connection}`);

      const isConnected = parsed.connection === "connected" || parsed.connection === "open";
      const updatedCreds = { ...creds };
      delete updatedCreds.qr_code;

      if (isConnected) {
        updatedCreds.connected = true;

        // Fetch and store the connected phone number for reliable fromMe detection.
        // UZAPI sends display_phone_number as "" in webhooks, so we must fetch it from the API.
        try {
          const { baseUrl, username } = getUzapiBaseConfig();
          const instRes = await fetch(uzapiUrl(baseUrl, username, parsed.phoneNumberId, "instance"), {
            headers: uzapiHeaders(updatedCreds.token as string),
          });
          if (instRes.ok) {
            const instData = await instRes.json();
            const phone = instData.phoneNumber;
            if (phone) {
              updatedCreds.connectedPhone = formatPhone(String(phone));
              console.log("webhook-uzapi connection: stored connectedPhone=", updatedCreds.connectedPhone);
            }
          }
        } catch (e) {
          console.warn("webhook-uzapi connection: failed to fetch instance phone:", e);
        }
      } else {
        updatedCreds.connected = false;
      }

      await supabaseClient.from("integracoes").update({ credentials: updatedCreds }).eq("id", integracao.id);

      return new Response(JSON.stringify({ status: "connection_logged" }), { status: 200 });
    }

    // --- Handle status updates (delivered, read, played) ---
    if (parsed.type === "status") {
      let syncAttempted = false;

      for (const s of parsed.statuses) {
        if (s.id && s.status) {
          // Check if the message is already tracked
          const { data: existingMsg } = await supabaseClient
            .from("chat_mensagens")
            .select("id")
            .eq("message_id", s.id)
            .maybeSingle();

          if (existingMsg) {
            await supabaseClient
              .from("chat_mensagens")
              .update({ status: s.status })
              .eq("message_id", s.id);
          } else if (parsed.recipientWaId && ["delivered", "sent", "read", "failed", "error"].includes(s.status)) {
            // Outbound message that wasn't synced earlier because the "to" field was missing in the 'messages' event.
            // We can recover its payload from the _webhook_debug table since we now have the recipient!
            const searchPayload = {
              entry: [{ changes: [{ value: { messages: [{ id: s.id }] } }] }]
            };
            const { data: dbgArr } = await supabaseClient
              .from("_webhook_debug")
              .select("raw_payload, parsed")
              .contains("raw_payload", searchPayload)
              .order("created_at", { ascending: false })
              .limit(1);

            if (dbgArr && dbgArr.length > 0) {
              const dbgRow = dbgArr[0];
              // Use the stored 'parsed' object directly — it may have been
              // updated with the Supabase public URL after media download.
              const dbgParsed = dbgRow.parsed || parseWebhookMessage(dbgRow.raw_payload as Record<string, unknown>);

              if (dbgParsed && (dbgParsed.type === "message" || dbgParsed.msgType)) {
                syncAttempted = true;
                const contactPhone = formatPhone(parsed.recipientWaId);

                // Find existing conversation for this contact
                const { data: conversa } = await supabaseClient
                  .from("chat_conversas")
                  .select("id")
                  .eq("clinica_id", clinica_id)
                  .eq("phone", contactPhone)
                  .maybeSingle();

                if (conversa) {
                  // Check if already inserted (avoid duplicates)
                  const msgId = dbgParsed.id || null;
                  const { data: existing } = msgId ? await supabaseClient
                    .from("chat_mensagens")
                    .select("id")
                    .eq("message_id", msgId)
                    .maybeSingle() : { data: null };

                  if (!existing) {
                    // Resolve media_url: if dbgParsed.mediaId is a raw numeric ID (not a URL),
                    // check if the file was already downloaded to storage by the concurrent message webhook.
                    let resolvedMediaUrl = dbgParsed.mediaId || null;
                    const binaryTypes = ['image', 'audio', 'video', 'document', 'sticker'];
                    if (resolvedMediaUrl && !resolvedMediaUrl.startsWith('http') && binaryTypes.includes(dbgParsed.msgType)) {
                      const searchName = msgId || 'unknown';
                      const { data: storageFiles } = await supabaseClient.storage
                        .from('chat-media')
                        .list(clinica_id, { search: searchName });
                      if (storageFiles && storageFiles.length > 0) {
                        const { data: urlData } = supabaseClient.storage
                          .from('chat-media')
                          .getPublicUrl(`${clinica_id}/${storageFiles[0].name}`);
                        resolvedMediaUrl = urlData.publicUrl;
                        console.log(`webhook-uzapi: status recovery resolved media_url from storage: ${resolvedMediaUrl}`);
                      } else {
                        console.log(`webhook-uzapi: status recovery media not yet in storage for msg=${msgId}, using raw mediaId`);
                      }
                    }

                    await supabaseClient.from("chat_mensagens").insert({
                      clinica_id,
                      conversa_id: conversa.id,
                      message_id: msgId,
                      from_me: true,
                      tipo: dbgParsed.msgType,
                      conteudo: dbgParsed.content,
                      media_url: resolvedMediaUrl,
                      media_mime_type: dbgParsed.mediaMimeType || null,
                      status: s.status,
                    });

                    await supabaseClient.from("chat_conversas").update({
                      ultima_mensagem: dbgParsed.content,
                      ultima_mensagem_at: new Date().toISOString(),
                    }).eq("id", conversa.id);
                  }
                }
              }
            }
          }
        }
      }
      return new Response(JSON.stringify({ status: "statuses_updated", syncAttempted }), { status: 200 });
    }

    // --- Handle incoming/outgoing messages ---
    if (parsed.type === "message") {
      if (parsed.isGroup) {
        return new Response(JSON.stringify({ status: "ignored_group" }), { status: 200 });
      }
      if (parsed.msgType === "reaction") {
        return new Response(JSON.stringify({ status: "reaction_noted" }), { status: 200 });
      }

      // Download and upload media handling is moved to the end to prevent blocking real-time UI
      const binaryMediaTypes = ['image', 'audio', 'video', 'document', 'sticker'];
      const hasBinaryMedia = parsed.mediaId && binaryMediaTypes.includes(parsed.msgType);

      // Reliable fromMe detection: compare from with stored connectedPhone.
      // UZAPI sends display_phone_number as "" so we use the cached connectedPhone instead.
      const connectedPhone = (creds.connectedPhone as string | undefined) || "";
      const fromDigits = parsed.from ? parsed.from.replace(/\D/g, "") : "";
      const connDigits = connectedPhone.replace(/\D/g, "");

      // Suffix matching: Brazilian numbers may appear with/without country code (55) or
      // the extra "9" digit added in 2012. Compare by the last 8 digits (core number).
      const fromSuffix = fromDigits.slice(-8);
      const connSuffix = connDigits.slice(-8);
      const phoneMatch = !!fromDigits && !!connDigits &&
        (fromDigits === connDigits || (fromSuffix.length === 8 && fromSuffix === connSuffix));

      const isFromMe = parsed.fromMe || phoneMatch;

      // DEBUG: update the debug row with the decision
      const debugDecision = JSON.stringify({
        isFromMe, parsedFromMe: parsed.fromMe, phoneMatch,
        fromDigits, connDigits, parsedTo: parsed.to,
        connectedPhoneRaw: connectedPhone || "(empty)",
      });
      await supabaseClient.from("_webhook_debug")
        .update({ decision: debugDecision })
        .eq("raw_payload->>id", (rawPayload?.id || ""))
        .then(() => {}).catch(() => {});

      // Filter invalid phone numbers (group JIDs are too long or contain non-digits)
      if (!isFromMe && (fromDigits.length < 10 || fromDigits.length > 15)) {
        return new Response(JSON.stringify({ status: "ignored_invalid_phone" }), { status: 200 });
      }

      // --- Outbound message sent from phone (not via CRM) ---
      if (isFromMe) {
        // Determine the contact (recipient).
        // UZAPI/Baileys sends fromMe messages in two formats:
        //   A) from=ownNumber, to=contactNumber  (standard)
        //   B) from=contactNumber, fromMe=true, to=""  (Baileys remoteJid style)
        let contactRaw: string | null = null;
        if (parsed.to) {
          // Format A: explicit to field
          contactRaw = parsed.to;
        } else if (!phoneMatch) {
          // Format B: from IS the contact because it's not our own number
          contactRaw = parsed.from;
        }

        if (!contactRaw) {
          console.log("webhook-uzapi: fromMe but cannot determine contact, from=", parsed.from, "to=", parsed.to);
          // Log for debugging but DON'T return — let the media download block below process the media
          await supabaseClient.from("_webhook_debug").insert({
            raw_payload: JSON.parse(JSON.stringify(rawPayload)),
            parsed: JSON.parse(JSON.stringify(parsed)),
            decision: "stored_for_recovery"
          });
          // Skip conversation handling below (no contact to match), but continue to media download
        } else {
        const contactPhone = formatPhone(contactRaw);

        // Find existing conversation for this contact
        let { data: conversa } = await supabaseClient
          .from("chat_conversas")
          .select("id")
          .eq("clinica_id", clinica_id)
          .eq("phone", contactPhone)
          .maybeSingle();

        if (!conversa) {
          // Create Lead and Conversation automatically for outbound messages
          let { data: lead } = await supabaseClient
            .from("leads")
            .select("id")
            .eq("clinica_id", clinica_id)
            .eq("telefone", contactPhone)
            .maybeSingle();

          if (!lead) {
            const { data: newLead } = await supabaseClient
              .from("leads")
              .insert({
                clinica_id,
                setor_id,
                nome: "Contato " + contactPhone, 
                telefone: contactPhone,
                origem: "WhatsApp",
                etapa_funil: "Novo Lead",
              })
              .select("id")
              .single();
            lead = newLead;
          }

          const { data: newConversa } = await supabaseClient
            .from("chat_conversas")
            .insert({
              clinica_id,
              setor_id,
              phone: contactPhone,
              nome: "Contato " + contactPhone,
              lead_id: lead ? lead.id : null,
              ultima_mensagem: parsed.content || "Mídia",
              ultima_mensagem_at: new Date().toISOString(),
              nao_lidas: 0,
            })
            .select("id")
            .single();
          conversa = newConversa;
        }

        if (conversa) {
          // Check if message already saved (sent via CRM send-message function)
          const { data: existing } = await supabaseClient
            .from("chat_mensagens")
            .select("id")
            .eq("message_id", parsed.id)
            .maybeSingle();

          if (!existing) {
            // Check if media was already downloaded by a concurrent webhook
            let resolvedMediaUrl = parsed.mediaId || null;
            if (parsed.mediaId && hasBinaryMedia) {
              const cleanMime = (parsed.mediaMimeType || '').split(';')[0].trim();
              const ext = cleanMime.split('/')[1] || 'bin';
              const { data: existingFile } = await supabaseClient.storage
                .from('chat-media')
                .list(clinica_id, { search: `${parsed.id}` });
              if (existingFile && existingFile.length > 0) {
                const { data: urlData } = supabaseClient.storage
                  .from('chat-media')
                  .getPublicUrl(`${clinica_id}/${existingFile[0].name}`);
                resolvedMediaUrl = urlData.publicUrl;
                console.log(`webhook-uzapi: fromMe insert found pre-downloaded media: ${resolvedMediaUrl}`);
              }
            }
            
            await supabaseClient.from("chat_mensagens").insert({
              clinica_id,
              conversa_id: conversa.id,
              message_id: parsed.id || null,
              from_me: true,
              tipo: parsed.msgType,
              conteudo: parsed.content,
              media_url: resolvedMediaUrl,
              media_mime_type: parsed.mediaMimeType || null,
              status: "sent",
            });

            await supabaseClient.from("chat_conversas").update({
              ultima_mensagem: parsed.content,
              ultima_mensagem_at: new Date().toISOString(),
            }).eq("id", conversa.id);
          }
        }
        } // close else (contactRaw exists)
      }

      // --- Incoming message from contact ---
      if (!isFromMe) {
        const phone = formatPhone(parsed.from);
        const pushName = parsed.pushName;

      let { data: lead } = await supabaseClient
        .from("leads")
        .select("id")
        .eq("clinica_id", clinica_id)
        .eq("telefone", phone)
        .maybeSingle();

      if (!lead) {
        const { data: newLead } = await supabaseClient
          .from("leads")
          .insert({
            clinica_id,
            setor_id,
            nome: pushName,
            telefone: phone,
            origem: "WhatsApp",
            etapa_funil: "Novo Lead",
          })
          .select()
          .single();
        lead = newLead;
      }

      let { data: conversa } = await supabaseClient
        .from("chat_conversas")
        .select("id, nao_lidas")
        .eq("clinica_id", clinica_id)
        .eq("phone", phone)
        .maybeSingle();

      if (!conversa) {
        const { data: newConversa } = await supabaseClient
          .from("chat_conversas")
          .insert({
            clinica_id,
            setor_id,
            phone,
            nome: pushName,
            lead_id: lead ? lead.id : null,
            ultima_mensagem: parsed.content || "Mídia recebida",
            ultima_mensagem_at: new Date().toISOString(),
            nao_lidas: 1, // New conversation, already 1 unread
          })
          .select("id, nao_lidas")
          .single();
        conversa = newConversa;
      }

      if (conversa) {
        await supabaseClient.from("chat_mensagens").insert({
          clinica_id,
          conversa_id: conversa.id,
          message_id: parsed.id || null,
          from_me: false,
          tipo: parsed.msgType,
          conteudo: parsed.content,
          media_url: parsed.mediaId || null,
          media_mime_type: parsed.mediaMimeType || null,
          status: "delivered",
        });

        const numNaoLidas = (conversa.nao_lidas || 0) + 1;
        
          await supabaseClient.from("chat_conversas").update({
            ultima_mensagem: parsed.content,
            ultima_mensagem_at: new Date().toISOString(),
            nao_lidas: numNaoLidas,
          }).eq("id", conversa.id);
        }
      }

      // --- Download Media Asynchronously (After insertion) ---
      // This prevents the webhook from blocking the real-time UI update!
      if (hasBinaryMedia) {
        console.log(`webhook-uzapi: Downloading media ${parsed.mediaId} (type=${parsed.msgType}, mime=${parsed.mediaMimeType}, fromMe=${isFromMe})`);
        
        // LIMITATION FIX: If the user sends a message from the physical phone (isFromMe=true),
        // Baileys/Uzapi lacks the media key instantly. We MUST wait a few seconds before trying to download it.
        if (isFromMe) {
          console.log(`webhook-uzapi: [Delay] Waiting 4s for Baileys to acquire outbound media key...`);
          await new Promise(resolve => setTimeout(resolve, 4000));
        }

        // Extract clean extension from mime (e.g., "audio/ogg; codecs=opus" -> "ogg")
        const cleanMime = (parsed.mediaMimeType || '').split(';')[0].trim();
        const ext = cleanMime.split('/')[1] || 'bin';
        const uploadPath = `${clinica_id}/${parsed.id || Date.now()}.${ext}`;
        const token = creds.token as string;
        
        const mediaResult = await downloadAndUploadMediaDetailed(
          supabaseClient,
          { phoneNumberId: parsed.phoneNumberId, token },
          parsed.mediaId as string,
          parsed.mediaMimeType || 'application/octet-stream',
          uploadPath,
          4 // Pass 4 max retries
        );
        
        if (mediaResult.publicUrl) {
          console.log(`webhook-uzapi: Media uploaded to ${mediaResult.publicUrl}`);

          // CRITICAL: Update the _webhook_debug row with the public URL so that
          // the status handler (recovery insert) can use it instead of raw mediaId.
          if (parsed.id) {
            const searchPayloadForUpdate = {
              entry: [{ changes: [{ value: { messages: [{ id: parsed.id }] } }] }]
            };
            const { data: dbgRows } = await supabaseClient
              .from("_webhook_debug")
              .select("id, parsed")
              .contains("raw_payload", searchPayloadForUpdate)
              .limit(1);
            if (dbgRows && dbgRows.length > 0) {
              const updatedParsed = { ...(dbgRows[0].parsed || {}), mediaId: mediaResult.publicUrl };
              await supabaseClient.from("_webhook_debug")
                .update({ parsed: updatedParsed })
                .eq("id", dbgRows[0].id);
              console.log(`webhook-uzapi: updated _webhook_debug parsed.mediaId with public URL for msg=${parsed.id}`);
            }
          }
          
          // Retry loop: the message row may be inserted by a concurrent webhook event,
          // so we retry the update a few times with delays to handle the race condition.
          for (let updateAttempt = 1; updateAttempt <= 3; updateAttempt++) {
            // Try updating by message_id
            const { data: updated1 } = await supabaseClient
              .from("chat_mensagens")
              .update({ media_url: mediaResult.publicUrl })
              .eq("message_id", parsed.id)
              .eq("clinica_id", clinica_id)
              .select("id");
            
            if (updated1 && updated1.length > 0) {
              console.log(`webhook-uzapi: media_url updated via message_id on attempt ${updateAttempt}`);
              break;
            }
            
            // Try updating by raw mediaId stored in media_url column
            const { data: updated2 } = await supabaseClient
              .from("chat_mensagens")
              .update({ media_url: mediaResult.publicUrl })
              .eq("media_url", parsed.mediaId as string)
              .eq("clinica_id", clinica_id)
              .select("id");
            
            if (updated2 && updated2.length > 0) {
              console.log(`webhook-uzapi: media_url updated via raw mediaId on attempt ${updateAttempt}`);
              break;
            }
            
            if (updateAttempt < 3) {
              console.log(`webhook-uzapi: media_url update attempt ${updateAttempt} found 0 rows, retrying in 2s...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              console.error(`webhook-uzapi: media_url update FAILED after 3 attempts for message_id=${parsed.id}, mediaId=${parsed.mediaId}`);
            }
          }
        } else {
          console.error(`webhook-uzapi: Media download FAILED at ${mediaResult.step} after ${mediaResult.attempts} attempts: ${mediaResult.error}`);
          await supabaseClient.from("_webhook_debug").insert({
            raw_payload: payload,
            decision: `media_download_failed`,
            parsed: {
              step: mediaResult.step,
              error: mediaResult.error,
              attempts: mediaResult.attempts,
              mediaId: parsed.mediaId,
              mime: parsed.mediaMimeType,
            },
          }).then(() => {}).catch(() => {});
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "unhandled" }), { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
