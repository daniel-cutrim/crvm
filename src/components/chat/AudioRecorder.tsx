import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioRecorderProps {
  onSend: (base64: string) => void;
  disabled?: boolean;
}

export default function AudioRecorder({ onSend, disabled }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };

      mediaRecorder.start(100);
      setRecording(true);
      setDuration(0);
      setAudioBlob(null);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      console.error('Microphone permission denied');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }

  function cancelRecording() {
    setAudioBlob(null);
    setDuration(0);
  }

  async function handleSend() {
    if (!audioBlob) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onSend(base64);
      setAudioBlob(null);
      setDuration(0);
    };
    reader.readAsDataURL(audioBlob);
  }

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (audioBlob) {
    return (
      <div className="flex items-center gap-2 flex-1">
        <Button variant="ghost" size="icon" onClick={cancelRecording} className="text-destructive shrink-0">
          <Trash2 size={18} />
        </Button>
        <div className="flex-1 flex items-center gap-2 bg-muted rounded-full px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-sm text-foreground font-medium">{formatDuration(duration)}</span>
          <audio src={URL.createObjectURL(audioBlob)} controls className="h-8 flex-1 max-w-[200px]" />
        </div>
        <Button size="icon" onClick={handleSend} disabled={disabled} className="shrink-0">
          <Send size={18} />
        </Button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2 flex-1">
        <div className="flex-1 flex items-center gap-2 bg-destructive/10 rounded-full px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm text-destructive font-medium">Gravando {formatDuration(duration)}</span>
        </div>
        <Button variant="destructive" size="icon" onClick={stopRecording} className="shrink-0">
          <Square size={16} />
        </Button>
      </div>
    );
  }

  return (
    <Button variant="ghost" size="icon" onClick={startRecording} disabled={disabled} className="shrink-0 text-muted-foreground hover:text-foreground">
      <Mic size={20} />
    </Button>
  );
}
