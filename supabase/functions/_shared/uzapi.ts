// Shared UZAPI helper for all edge functions
// UZAPI follows Meta WhatsApp Cloud API format
// Token is PER INSTANCE (stored in credentials), not global

export function getUzapiBaseConfig() {
  const baseUrl = Deno.env.get("UZAPI_BASE_URL");
  const username = Deno.env.get("UZAPI_USERNAME");

  if (!baseUrl || !username) {
    throw new Error("UZAPI not configured: missing UZAPI_BASE_URL or UZAPI_USERNAME");
  }

  return { baseUrl, username };
}

export function uzapiHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

export function uzapiUrl(baseUrl: string, username: string, phoneNumberId: string, path: string): string {
  return `${baseUrl}/${username}/v1/${phoneNumberId}/${path}`;
}

export async function sendUzapiTextMessage(
  creds: { phoneNumberId: string; token: string },
  to: string,
  body: string,
  delayMessage = 1,
  delayTyping = 3,
) {
  const { baseUrl, username } = getUzapiBaseConfig();
  const url = uzapiUrl(baseUrl, username, creds.phoneNumberId, "messages");

  const res = await fetch(url, {
    method: "POST",
    headers: uzapiHeaders(creds.token),
    body: JSON.stringify({
      to,
      type: "text",
      text: { body },
      delayMessage,
      delayTyping,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`UZAPI ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

export async function sendUzapiAudioMessage(
  creds: { phoneNumberId: string; token: string },
  to: string,
  audioLink: string,
  delayMessage = 1,
) {
  const { baseUrl, username } = getUzapiBaseConfig();
  const url = uzapiUrl(baseUrl, username, creds.phoneNumberId, "messages");

  const res = await fetch(url, {
    method: "POST",
    headers: uzapiHeaders(creds.token),
    body: JSON.stringify({
      to,
      type: "audio",
      audio: { link: audioLink },
      delayMessage,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`UZAPI ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

// Extract message content from UZAPI webhook payload (Meta Cloud API format)
export function parseWebhookMessage(payload: Record<string, unknown>) {
  if (payload.object !== "whatsapp_business_account") return null;

  const entry = (payload.entry as Array<Record<string, unknown>>)?.[0];
  const change = (entry?.changes as Array<Record<string, unknown>>)?.[0];
  const value = change?.value as Record<string, unknown>;
  const field = change?.field as string;

  if (!value) return null;

  const metadata = value.metadata as { display_phone_number?: string; phone_number_id?: string };
  const phoneNumberId = metadata?.phone_number_id || "";
  const displayPhoneNumber = metadata?.display_phone_number || "";

  // QR Code events (authentication)
  if (field === "authentication" && value.qrcode) {
    const qrcodes = value.qrcode as Array<{ code?: string }>;
    const qrCode = qrcodes?.[0]?.code || null;
    return { type: "qrcode" as const, phoneNumberId, displayPhoneNumber, qrCode };
  }

  // Connection events
  if (field === "connection") {
    const statusArr = value.status as Array<{ connection?: string }>;
    const connection = statusArr?.[0]?.connection || "unknown";
    return { type: "connection" as const, phoneNumberId, displayPhoneNumber, connection };
  }

  // Status updates (delivered, read, played)
  if (field === "messages" && value.statuses) {
    const statuses = value.statuses as Array<{
      id?: string;
      status?: string;
      timestamp?: string;
      recipient_id?: string;
    }>;
    const contacts = value.contacts as Array<{ wa_id?: string }>;
    const recipientWaId = contacts?.[0]?.wa_id || "";
    return { type: "status" as const, phoneNumberId, displayPhoneNumber, statuses, recipientWaId };
  }

  // Incoming messages
  if (field === "messages" && value.messages) {
    const contacts = value.contacts as Array<{ profile?: { name?: string }; wa_id?: string }>;
    const messages = value.messages as Array<Record<string, unknown>>;
    const msg = messages[0];
    if (!msg) return null;

    const from = msg.from as string;
    const id = msg.id as string;
    const isGroup = !!(msg.isGroup);
    // Detect outbound via explicit flag only.
    // displayPhoneNumber is always "" from UZAPI webhooks, so number comparison is done
    // in webhook-uzapi/index.ts using the stored connectedPhone credential instead.
    const fromMe = !!(msg.from_me ?? (msg as Record<string, unknown>).fromMe);
    // For outbound: use msg.to, or contacts[0].wa_id if different from "from"
    const contactWaId = contacts?.[0]?.wa_id || "";
    const to = (msg.to as string | undefined) || (contactWaId !== from ? contactWaId : "") || "";
    const timestamp = msg.timestamp as string;
    const msgType = msg.type as string;
    const pushName = contacts?.[0]?.profile?.name || from;

    let content = "";
    let mediaId: string | null = null;
    let mediaMimeType: string | null = null;

    switch (msgType) {
      case "text":
        content = (msg.text as { body?: string })?.body || "";
        break;
      case "image": {
        const img = msg.image as { id?: string; caption?: string; mime_type?: string };
        content = img?.caption || "\ud83d\udcf7 Imagem";
        mediaId = img?.id || null;
        mediaMimeType = img?.mime_type || null;
        break;
      }
      case "audio": {
        const aud = msg.audio as { id?: string; mime_type?: string };
        content = "\ud83c\udfb5 \u00c1udio";
        mediaId = aud?.id || null;
        mediaMimeType = aud?.mime_type || null;
        break;
      }
      case "video": {
        const vid = msg.video as { id?: string; caption?: string; mime_type?: string };
        content = vid?.caption || "\ud83c\udfa5 V\u00eddeo";
        mediaId = vid?.id || null;
        mediaMimeType = vid?.mime_type || null;
        break;
      }
      case "document": {
        const doc = msg.document as { id?: string; filename?: string; mime_type?: string; caption?: string };
        content = doc?.caption || `\ud83d\udcc4 ${doc?.filename || "Documento"}`;
        mediaId = doc?.id || null;
        mediaMimeType = doc?.mime_type || null;
        break;
      }
      case "sticker": {
        const stk = msg.sticker as { id?: string; mime_type?: string };
        content = "\ud83c\udff7\ufe0f Sticker";
        mediaId = stk?.id || null;
        mediaMimeType = stk?.mime_type || null;
        break;
      }
      case "reaction": {
        const react = msg.reaction as { emoji?: string; message_id?: string };
        content = react?.emoji || "\ud83d\udc4d";
        break;
      }
      case "location": {
        const loc = msg.location as { latitude?: number; longitude?: number; name?: string; address?: string };
        content = loc?.name || loc?.address || "\ud83d\udccd Localiza\u00e7\u00e3o";
        if (loc?.latitude && loc?.longitude) {
          mediaId = `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;
        }
        break;
      }
      case "contacts": {
        const ctcs = msg.contacts as Array<{ name?: { formatted_name?: string }; phones?: Array<{ phone?: string; type?: string }> }>;
        const firstContact = ctcs?.[0];
        content = `\ud83d\udc64 ${firstContact?.name?.formatted_name || "Contato"}`;
        if (firstContact?.phones?.[0]?.phone) {
          mediaId = JSON.stringify({ name: firstContact.name?.formatted_name, phone: firstContact.phones[0].phone });
        }
        break;
      }
      case "interactive":
      case "list_reply":
      case "button_reply": {
        const interactiveObj = msg.interactive as { type?: string; list_reply?: { title?: string; description?: string }; button_reply?: { title?: string } } | undefined;
        const iType = interactiveObj?.type || msgType;
        
        if (iType === "list_reply" || msgType === "list_reply") {
          const list = interactiveObj?.list_reply;
          content = list?.title || list?.description || "📝 Resposta de Menu";
        } else if (iType === "button_reply" || msgType === "button_reply") {
          const btn = interactiveObj?.button_reply;
          content = btn?.title || "🟢 Botão";
        } else {
          content = "👉 Interação";
        }
        break;
      }
      default:
        content = `\ud83d\udcce ${msgType}`;
    }

    return {
      type: "message" as const,
      phoneNumberId,
      displayPhoneNumber,
      from,
      to,
      id,
      isGroup,
      fromMe,
      timestamp,
      msgType,
      pushName,
      content,
      mediaId,
      mediaMimeType,
    };
  }

  return null;
}

export interface MediaDownloadResult {
  publicUrl: string | null;
  error: string | null;
  step: string;
  attempts: number;
}

export async function downloadAndUploadMedia(
  supabaseClient: any,
  creds: { phoneNumberId: string; token: string },
  mediaId: string,
  mediaMimeType: string,
  uploadPath: string
): Promise<string | null> {
  const result = await downloadAndUploadMediaDetailed(supabaseClient, creds, mediaId, mediaMimeType, uploadPath);
  return result.publicUrl;
}

export async function downloadAndUploadMediaDetailed(
  supabaseClient: any,
  creds: { phoneNumberId: string; token: string },
  mediaId: string,
  mediaMimeType: string,
  uploadPath: string,
  maxRetries = 3
): Promise<MediaDownloadResult> {
  let lastError = "";
  let lastStep = "init";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { baseUrl, username } = getUzapiBaseConfig();
      const url = `${baseUrl}/${username}/v1/${mediaId}?phone_number_id=${creds.phoneNumberId}`;

      // Step 1: Get media download URL from UZAPI
      lastStep = "step1_get_media_url";
      console.log(`[media-dl] attempt=${attempt} step=1 fetching: ${url}`);

      const res = await fetch(url, {
        method: "GET",
        headers: uzapiHeaders(creds.token),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        lastError = `UZAPI ${res.status}: ${errBody.slice(0, 200)}`;
        console.error(`[media-dl] attempt=${attempt} step=1 FAIL: ${lastError}`);
        if (attempt < maxRetries) { await sleep(1000 * attempt); continue; }
        return { publicUrl: null, error: lastError, step: lastStep, attempts: attempt };
      }

      const data = await res.json();
      console.log(`[media-dl] attempt=${attempt} step=1 OK: url=${data.url ? "present" : "MISSING"} mime=${data.mime_type || "?"}`);

      if (!data.url) {
        lastError = `No download URL returned: ${JSON.stringify(data).slice(0, 200)}`;
        console.error(`[media-dl] attempt=${attempt} step=1 FAIL: ${lastError}`);
        if (attempt < maxRetries) { await sleep(1000 * attempt); continue; }
        return { publicUrl: null, error: lastError, step: lastStep, attempts: attempt };
      }

      // Step 2: Download binary stream
      lastStep = "step2_download_binary";
      console.log(`[media-dl] attempt=${attempt} step=2 downloading binary from: ${data.url.slice(0, 80)}...`);

      const binaryRes = await fetch(data.url);
      if (!binaryRes.ok) {
        lastError = `Binary fetch ${binaryRes.status}: ${binaryRes.statusText}`;
        console.error(`[media-dl] attempt=${attempt} step=2 FAIL: ${lastError}`);
        if (attempt < maxRetries) { await sleep(1000 * attempt); continue; }
        return { publicUrl: null, error: lastError, step: lastStep, attempts: attempt };
      }

      const blob = await binaryRes.blob();
      console.log(`[media-dl] attempt=${attempt} step=2 OK: size=${blob.size} type=${blob.type}`);

      if (blob.size === 0) {
        lastError = "Downloaded blob is empty (0 bytes)";
        console.error(`[media-dl] attempt=${attempt} step=2 FAIL: ${lastError}`);
        if (attempt < maxRetries) { await sleep(1000 * attempt); continue; }
        return { publicUrl: null, error: lastError, step: lastStep, attempts: attempt };
      }

      // Step 3: Upload to Supabase Storage
      lastStep = "step3_upload_storage";
      const cleanMime = mediaMimeType.split(';')[0].trim();
      console.log(`[media-dl] attempt=${attempt} step=3 uploading to chat-media/${uploadPath} (${cleanMime}, ${blob.size} bytes)`);

      const { error: uploadError } = await supabaseClient.storage
        .from('chat-media')
        .upload(uploadPath, blob, { contentType: cleanMime, upsert: true });

      if (uploadError) {
        lastError = `Storage upload: ${JSON.stringify(uploadError)}`;
        console.error(`[media-dl] attempt=${attempt} step=3 FAIL: ${lastError}`);
        if (attempt < maxRetries) { await sleep(1000 * attempt); continue; }
        return { publicUrl: null, error: lastError, step: lastStep, attempts: attempt };
      }

      // Step 4: Return public URL
      lastStep = "step4_get_public_url";
      const { data: urlData } = supabaseClient.storage.from('chat-media').getPublicUrl(uploadPath);
      console.log(`[media-dl] attempt=${attempt} step=4 SUCCESS -> ${urlData.publicUrl}`);

      return { publicUrl: urlData.publicUrl, error: null, step: "done", attempts: attempt };

    } catch (error) {
      lastError = `Exception: ${(error as Error).message || String(error)}`;
      console.error(`[media-dl] attempt=${attempt} step=${lastStep} EXCEPTION: ${lastError}`);
      if (attempt < maxRetries) { await sleep(1000 * attempt); continue; }
    }
  }

  return { publicUrl: null, error: lastError, step: lastStep, attempts: maxRetries };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
