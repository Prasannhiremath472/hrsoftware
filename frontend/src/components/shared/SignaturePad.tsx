import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Eraser, PenTool } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SignaturePadProps {
  /** Fires with a PNG data URL on stroke end, or null when cleared. */
  onChange: (dataUrl: string | null) => void;
  className?: string;
}

/**
 * Canvas signature pad built on pointer events, so mouse, stylus and touch all
 * work through one code path. The backing store is resized to the device pixel
 * ratio on mount and on container resize; existing strokes are preserved across
 * a resize by replaying the captured bitmap.
 */
export default function SignaturePad({ onChange, className }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const configureContext = useCallback((ctx: CanvasRenderingContext2D, ratio: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Canvas can't read Tailwind classes, so resolve the foreground token at draw time.
    const foreground = getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim();
    ctx.strokeStyle = foreground ? `hsl(${foreground})` : '#0f172a';
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const nextWidth = Math.round(rect.width * ratio);
      const nextHeight = Math.round(rect.height * ratio);
      if (canvas.width === nextWidth && canvas.height === nextHeight) return;

      // Preserve whatever has been drawn so far across the resize.
      const previous = canvas.width > 0 && canvas.height > 0 ? canvas.toDataURL('image/png') : null;
      const hadContent = !isEmpty;

      canvas.width = nextWidth;
      canvas.height = nextHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      configureContext(ctx, ratio);

      if (previous && hadContent) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
        img.src = previous;
      }
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [configureContext, isEmpty]);

  const positionOf = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = positionOf(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    e.currentTarget.setPointerCapture(e.pointerId);
    // Prevent the browser from turning a touch-drag into a page scroll.
    e.preventDefault();
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const { x, y } = positionOf(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (isEmpty) setIsEmpty(false);
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    onChange(e.currentTarget.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setIsEmpty(true);
    onChange(null);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative overflow-hidden rounded-md border border-input bg-card shadow-xs">
        <canvas
          ref={canvasRef}
          className="block h-48 w-full cursor-crosshair touch-none"
          aria-label="Signature drawing area"
          role="img"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <PenTool className="size-5" aria-hidden="true" />
            <span className="text-xs">Sign here</span>
          </div>
        )}
        {/* Signing baseline */}
        <div className="pointer-events-none absolute inset-x-8 bottom-8 border-b border-dashed border-border" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground" role="status">
          {isEmpty ? 'Sign above using mouse, stylus, or touch' : 'Signature captured'}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={clear} disabled={isEmpty}>
          <Eraser aria-hidden="true" />
          Clear
        </Button>
      </div>
    </div>
  );
}
