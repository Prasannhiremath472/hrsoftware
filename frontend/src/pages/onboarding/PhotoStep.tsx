import { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw } from 'lucide-react';

import api, { buildAuthedUrl, extractErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { WizardStepProps } from './types';

export default function PhotoStep({ candidateId, onSaved, goNext }: WizardStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    fetch(buildAuthedUrl(`/candidates/${candidateId}/photo`))
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setExistingPhoto(objectUrl);
      })
      .catch(() => {
        /* no existing photo — the empty state covers this */
      });

    return () => {
      cancelled = true;
      // Release the blob URL and shut the camera down when leaving the step.
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      stopCamera();
    };
  }, [candidateId]);

  const startCamera = async () => {
    setError('');

    // getUserMedia only exists on secure origins (HTTPS or localhost). On a
    // plain-HTTP LAN address the API is simply absent, so say so explicitly
    // rather than failing with a confusing permission message.
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        `Camera access is unavailable on this address (${window.location.origin}). ` +
          'Browsers only allow the camera over HTTPS or via localhost — open the app at ' +
          'http://localhost:5180 instead.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      // Mount the <video> first — it is rendered conditionally on cameraOn, so
      // videoRef is still null at this point. Attaching happens in the effect below.
      setCameraOn(true);
    } catch (err) {
      const e = err as DOMException;
      const detail =
        e?.name === 'NotAllowedError'
          ? 'Permission was denied. Allow camera access for this site in your browser settings, then try again.'
          : e?.name === 'NotFoundError'
            ? 'No camera device was found on this computer.'
            : e?.name === 'NotReadableError'
              ? 'The camera is already in use by another application. Close it and try again.'
              : e?.message || 'Unknown error.';
      setError(`Unable to access camera. ${detail}`);
    }
  };

  // Attach the stream once the <video> element has actually mounted.
  useEffect(() => {
    if (!cameraOn || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {
      setError('The camera stream could not be played. Try reopening the camera.');
    });
  }, [cameraOn]);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  }

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // videoWidth/Height stay 0 until the stream's metadata has loaded —
    // capturing then would silently produce a blank image.
    if (!video.videoWidth || !video.videoHeight) {
      setError('The camera is still starting up. Wait a moment and try again.');
      return;
    }

    setError('');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    setCapturedImage(canvas.toDataURL('image/png'));
    stopCamera();
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const accept = async () => {
    setSaving(true);
    try {
      await api.post(`/candidates/${candidateId}/photo`, { photoBase64: capturedImage });
      toast.success('Photo saved');
      await onSaved();
      goNext();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save photo'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2>Candidate Photo</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Capture a live photo using the webcam. Retake if needed before accepting.
      </p>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="relative mb-5 max-w-md overflow-hidden rounded-md border border-border bg-black">
        {capturedImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capturedImage} alt="Captured candidate" className="block w-full" />
        ) : cameraOn ? (
          <video ref={videoRef} autoPlay playsInline muted className="block w-full" />
        ) : existingPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={existingPhoto} alt="Existing candidate" className="block w-full" />
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-white/70">No photo captured yet</div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      <div className="mb-5 flex gap-2">
        {!cameraOn && !capturedImage && (
          <Button type="button" onClick={startCamera}>
            <Camera className="h-4 w-4" />
            Open Camera
          </Button>
        )}
        {cameraOn && (
          <Button type="button" onClick={capture}>
            <Camera className="h-4 w-4" />
            Capture Photo
          </Button>
        )}
        {capturedImage && (
          <Button type="button" variant="outline" onClick={retake}>
            <RotateCcw className="h-4 w-4" />
            Retake
          </Button>
        )}
      </div>

      <div className="flex justify-between border-t border-border pt-5">
        <span />
        <Button type="button" onClick={accept} disabled={saving || (!capturedImage && !existingPhoto)}>
          {saving ? 'Saving…' : 'Accept & Continue'}
        </Button>
      </div>
    </div>
  );
}
