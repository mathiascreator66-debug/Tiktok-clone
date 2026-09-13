"use client";

/**
 * Caméra in-app : Photo | Vidéo, effets spéciaux v1.
 * Les effets sont appliqués via canvas.filter (+ miroir) et cuits dans le blob :
 * - Photo : toBlob JPEG
 * - Vidéo : canvas.captureStream() + piste audio → MediaRecorder
 * (CSS-only ne suffit pas pour la vidéo publiée.)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  FlipHorizontal,
  SwitchCamera,
  Video,
  Image as ImageIcon,
  X,
  Circle,
  Square,
} from "lucide-react";

export type CameraMode = "photo" | "video";

export type CameraResult = {
  file: File;
  previewUrl: string;
  kind: "image" | "video";
};

type EffectId =
  | "normal"
  | "clair"
  | "contraste"
  | "sepia"
  | "nb"
  | "vintage"
  | "flou"
  | "vignette";

const EFFECTS: { id: EffectId; label: string; filter: string }[] = [
  { id: "normal", label: "Normal", filter: "none" },
  { id: "clair", label: "Clair", filter: "brightness(1.25) saturate(1.05)" },
  { id: "contraste", label: "Contraste", filter: "contrast(1.35) saturate(1.1)" },
  { id: "sepia", label: "Sépia", filter: "sepia(0.85) contrast(1.05)" },
  { id: "nb", label: "N&B", filter: "grayscale(1) contrast(1.1)" },
  {
    id: "vintage",
    label: "Vintage",
    filter: "sepia(0.35) contrast(1.1) brightness(1.05) saturate(1.2) hue-rotate(-8deg)",
  },
  { id: "flou", label: "Doux", filter: "blur(1.2px) brightness(1.08)" },
  {
    id: "vignette",
    label: "Vignette",
    filter: "brightness(0.95) contrast(1.15) saturate(1.1)",
  },
];

type Props = {
  /** photo | video | both (tabs) */
  allowModes?: CameraMode[];
  /** Max record seconds */
  maxSeconds?: number;
  onCapture: (result: CameraResult) => void;
  onCancel?: () => void;
  className?: string;
};

function pickRecorderMime(): string | undefined {
  const cands = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  if (typeof MediaRecorder === "undefined") return undefined;
  return cands.find((m) => MediaRecorder.isTypeSupported(m));
}

export default function CameraCapture({
  allowModes = ["photo", "video"],
  maxSeconds = 60,
  onCapture,
  onCancel,
  className = "",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartedAt = useRef(0);

  const [mode, setMode] = useState<CameraMode>(
    allowModes.includes("photo") ? "photo" : "video"
  );
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [mirror, setMirror] = useState(true);
  const [effect, setEffect] = useState<EffectId>("normal");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const effectFilter =
    EFFECTS.find((e) => e.id === effect)?.filter || "none";

  const stopStream = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError("");
    setReady(false);
    stopStream();
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Caméra non supportée sur cet appareil / navigateur.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play().catch(() => {});
      }
      setReady(true);
      // Mirror default for front camera
      setMirror(facing === "user");
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError(
          "Permission caméra / micro refusée. Autorisez l’accès dans les paramètres du navigateur."
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError("Aucune caméra détectée sur cet appareil.");
      } else if (name === "NotReadableError") {
        setError("Caméra déjà utilisée par une autre application.");
      } else {
        setError("Impossible d’ouvrir la caméra. Réessayez.");
      }
    }
  }, [facing, stopStream]);

  useEffect(() => {
    startCamera();
    return () => {
      try {
        recorderRef.current?.stop();
      } catch {
        /* */
      }
      stopStream();
    };
  }, [startCamera, stopStream]);

  // Draw filtered frames to canvas for live bake preview + recording source
  useEffect(() => {
    if (!ready) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tick = () => {
      const vw = video.videoWidth || 720;
      const vh = video.videoHeight || 1280;
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }
      ctx.save();
      ctx.filter = effectFilter;
      if (mirror) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      if (vw > 0 && vh > 0) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      ctx.restore();
      // Soft vignette overlay (baked)
      if (effect === "vignette") {
        const g = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          canvas.height * 0.25,
          canvas.width / 2,
          canvas.height / 2,
          canvas.height * 0.75
        );
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, "rgba(0,0,0,0.45)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [ready, effectFilter, mirror, effect]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - recordStartedAt.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [recording]);

  function flipCamera() {
    setFacing((f) => (f === "user" ? "environment" : "user"));
  }

  async function takePhoto() {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    setBusy(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
      );
      if (!blob) {
        setError("Échec de la capture photo.");
        return;
      }
      const file = new File([blob], `afrivoix-photo-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const previewUrl = URL.createObjectURL(blob);
      stopStream();
      onCapture({ file, previewUrl, kind: "image" });
    } finally {
      setBusy(false);
    }
  }

  function startRecording() {
    const canvas = canvasRef.current;
    const cam = streamRef.current;
    if (!canvas || !cam || !ready) return;
    const mime = pickRecorderMime();
    if (!mime || typeof MediaRecorder === "undefined") {
      setError("Enregistrement vidéo non supporté sur ce navigateur.");
      return;
    }
    // Bake video from filtered canvas + mic audio from camera stream
    const fps = 30;
    const canvasStream = canvas.captureStream(fps);
    const audioTracks = cam.getAudioTracks();
    const mixed = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);
    chunksRef.current = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(mixed, {
        mimeType: mime,
        videoBitsPerSecond: 2_500_000,
      });
    } catch {
      recorder = new MediaRecorder(mixed);
    }
    recorderRef.current = recorder;
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    recorder.onstop = () => {
      setRecording(false);
      const type = recorder.mimeType || mime || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `afrivoix-video-${Date.now()}.${ext}`, {
        type,
      });
      const previewUrl = URL.createObjectURL(blob);
      stopStream();
      onCapture({ file, previewUrl, kind: "video" });
    };
    recorder.start(200);
    recordStartedAt.current = Date.now();
    setElapsed(0);
    setRecording(true);
    // Auto-stop at maxSeconds
    window.setTimeout(() => {
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.stop();
      }
    }, maxSeconds * 1000);
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
  }

  function runWithCountdown(action: () => void) {
    if (countdown != null) return;
    setCountdown(3);
    let n = 3;
    const tick = () => {
      n -= 1;
      if (n <= 0) {
        setCountdown(null);
        action();
      } else {
        setCountdown(n);
        window.setTimeout(tick, 700);
      }
    };
    window.setTimeout(tick, 700);
  }

  function onShutter() {
    if (busy || countdown != null) return;
    if (mode === "photo") {
      runWithCountdown(() => void takePhoto());
    } else if (recording) {
      stopRecording();
    } else {
      runWithCountdown(() => startRecording());
    }
  }

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-black border border-white/15 ${className}`}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-black/60 z-10 relative">
        <div className="flex gap-1 p-0.5 rounded-full bg-white/10">
          {allowModes.includes("photo") && (
            <button
              type="button"
              onClick={() => !recording && setMode("photo")}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                mode === "photo" ? "bg-white text-black" : "text-white/70"
              }`}
            >
              <ImageIcon size={12} /> Photo
            </button>
          )}
          {allowModes.includes("video") && (
            <button
              type="button"
              onClick={() => !recording && setMode("video")}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                mode === "video" ? "bg-white text-black" : "text-white/70"
              }`}
            >
              <Video size={12} /> Vidéo
            </button>
          )}
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={() => {
              stopStream();
              onCancel();
            }}
            className="p-1.5 rounded-full bg-white/10"
            aria-label="Fermer la caméra"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="relative aspect-[9/16] max-h-[52vh] bg-black">
        {/* Hidden source video */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute opacity-0 pointer-events-none w-1 h-1"
        />
        {/* Visible filtered canvas (baked pipeline) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
            Ouverture de la caméra…
          </div>
        )}

        {countdown != null && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35">
            <span className="text-7xl font-black text-white drop-shadow-lg">
              {countdown}
            </span>
          </div>
        )}

        {recording && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-black/50 rounded-full px-2.5 py-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#fe2c55] animate-pulse" />
            REC {elapsed}s / {maxSeconds}s
          </div>
        )}

        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={flipCamera}
            disabled={recording}
            className="w-9 h-9 rounded-full bg-black/45 flex items-center justify-center disabled:opacity-40"
            aria-label="Changer de caméra"
          >
            <SwitchCamera size={16} />
          </button>
          <button
            type="button"
            onClick={() => setMirror((m) => !m)}
            disabled={recording}
            className={`w-9 h-9 rounded-full flex items-center justify-center ${
              mirror ? "bg-[#25f4ee]/30" : "bg-black/45"
            }`}
            aria-label="Miroir"
          >
            <FlipHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Effects grid */}
      <div className="px-2 py-2 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          {EFFECTS.map((e) => (
            <button
              key={e.id}
              type="button"
              disabled={recording}
              onClick={() => setEffect(e.id)}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap ${
                effect === e.id
                  ? "bg-[#fe2c55] text-white"
                  : "bg-white/10 text-white/70"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="px-3 pb-2 text-[#fe2c55] text-xs" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-center gap-6 py-3 pb-4">
        <button
          type="button"
          onClick={() => startCamera()}
          className="text-[11px] text-white/50 underline"
        >
          Réessayer
        </button>
        <button
          type="button"
          onClick={onShutter}
          disabled={!ready || busy || countdown != null}
          className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition disabled:opacity-40 ${
            mode === "video" && recording
              ? "border-white bg-[#fe2c55]"
              : "border-white/80 bg-white/20"
          }`}
          aria-label={
            mode === "photo"
              ? "Prendre une photo"
              : recording
                ? "Arrêter"
                : "Enregistrer"
          }
        >
          {mode === "photo" ? (
            <Camera size={26} />
          ) : recording ? (
            <Square size={22} className="fill-white" />
          ) : (
            <Circle size={28} className="fill-[#fe2c55] text-[#fe2c55]" />
          )}
        </button>
        <span className="text-[11px] text-white/40 w-14 text-center">
          {mode === "photo" ? "Photo" : recording ? "Stop" : "Filmer"}
        </span>
      </div>
    </div>
  );
}
