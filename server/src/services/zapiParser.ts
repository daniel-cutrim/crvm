/**
 * Z-API Webhook Payload Parser
 *
 * Z-API sends POST payloads with the following structure for messages:
 * {
 *   instanceId, messageId, phone, fromMe, momment (sic), status,
 *   chatName, senderName, senderPhoto, isGroup, type,
 *   text: { message }, image: { imageUrl, caption },
 *   audio: { audioUrl, seconds }, video: { videoUrl },
 *   document: { documentUrl, fileName }, sticker: { stickerUrl }
 * }
 */

export interface ParsedZapiMessage {
  messageId: string;
  phone: string;
  instanceId: string;
  role: 'lead' | 'atendente';
  content: string;
  messageType: string;
  mediaUrl: string | null;
  moment: number;
  contactName: string;
  senderPhoto: string | null;
  isGroup: boolean;
}

export function parseZapiPayload(body: Record<string, unknown>): ParsedZapiMessage | null {
  // Z-API sends different event types; only ReceivedCallback is a message
  // Other types: MessageStatusCallback, DisconnectedCallback, ConnectedCallback etc.
  const type = body.type as string | undefined;

  if (type !== 'ReceivedCallback') {
    return null;
  }

  // Ignore group messages
  if (body.isGroup === true) {
    return null;
  }

  const fromMe = body.fromMe === true;
  const rawPhone = body.phone as string || '';
  const phone = normalizePhone(rawPhone);
  const messageId = body.messageId as string || '';
  const instanceId = body.instanceId as string || '';
  // Z-API typo: "momment" with two m's
  const momment = body.momment as number || Date.now();
  const chatName = body.chatName as string || '';
  const senderName = body.senderName as string || chatName;
  const senderPhoto = body.senderPhoto as string || null;

  // Validate minimum required fields
  if (!phone || phone.length < 10 || !messageId) {
    return null;
  }

  const { content, messageType, mediaUrl } = extractContent(body);

  // Ignore reactions (don't save as message)
  if (messageType === 'reaction') {
    return null;
  }

  return {
    messageId,
    phone,
    instanceId,
    role: fromMe ? 'atendente' : 'lead',
    content,
    messageType,
    mediaUrl,
    moment: momment,
    contactName: senderName || `WhatsApp ${phone}`,
    senderPhoto,
    isGroup: false,
  };
}

function extractContent(body: Record<string, unknown>): {
  content: string;
  messageType: string;
  mediaUrl: string | null;
} {
  // Text message
  const text = body.text as { message?: string } | undefined;
  if (text?.message) {
    return { content: text.message, messageType: 'text', mediaUrl: null };
  }

  // Image
  const image = body.image as { imageUrl?: string; caption?: string } | undefined;
  if (image) {
    const caption = image.caption || '';
    return {
      content: caption || '📷 Imagem',
      messageType: 'image',
      mediaUrl: image.imageUrl || null,
    };
  }

  // Audio
  const audio = body.audio as { audioUrl?: string; seconds?: number } | undefined;
  if (audio) {
    const seconds = audio.seconds ? ` (${audio.seconds}s)` : '';
    return {
      content: `🎵 Áudio${seconds}`,
      messageType: 'audio',
      mediaUrl: audio.audioUrl || null,
    };
  }

  // Video
  const video = body.video as { videoUrl?: string; caption?: string } | undefined;
  if (video) {
    const caption = video.caption || '';
    return {
      content: caption || '🎥 Vídeo',
      messageType: 'video',
      mediaUrl: video.videoUrl || null,
    };
  }

  // Document
  const document = body.document as { documentUrl?: string; fileName?: string } | undefined;
  if (document) {
    const fileName = document.fileName || 'arquivo';
    return {
      content: `📄 ${fileName}`,
      messageType: 'document',
      mediaUrl: document.documentUrl || null,
    };
  }

  // Sticker
  const sticker = body.sticker as { stickerUrl?: string } | undefined;
  if (sticker) {
    return { content: '🏷️ Sticker', messageType: 'sticker', mediaUrl: sticker.stickerUrl || null };
  }

  // Reaction — flag to be ignored
  if (body.reaction) {
    return { content: '', messageType: 'reaction', mediaUrl: null };
  }

  // Location
  const location = body.location as { latitude?: number; longitude?: number } | undefined;
  if (location) {
    return {
      content: '📍 Localização',
      messageType: 'location',
      mediaUrl: location.latitude && location.longitude
        ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
        : null,
    };
  }

  // Unknown type — save content as generic
  return { content: '📎 Mensagem', messageType: 'other', mediaUrl: null };
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return ''; // Invalid phone, will be rejected by caller
  return digits.startsWith('55') ? digits : `55${digits}`;
}
