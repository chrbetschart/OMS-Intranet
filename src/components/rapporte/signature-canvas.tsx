"use client";

import { useRef, useEffect, useState } from "react";

interface Props {
  onSave: (dataUrl: string | null) => void;
  initialValue?: string | null;
  readOnly?: boolean;
}

export default function SignatureCanvas({ onSave, initialValue, readOnly }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1a1d2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (initialValue) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = initialValue;
      setHasSignature(true);
    }
  }, [initialValue]);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    if (readOnly) return;
    e.preventDefault();
    setDrawing(true);
    lastPos.current = getPos(e);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing || readOnly) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);

    ctx.beginPath();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPos.current = pos;
    setHasSignature(true);
  }

  function stopDrawing() {
    if (!drawing) return;
    setDrawing(false);
    lastPos.current = null;
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    onSave(dataUrl);
  }

  function clear() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1a1d2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSave(null);
  }

  return (
    <div>
      <div
        className="relative rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="w-full touch-none"
          style={{ cursor: readOnly ? "default" : "crosshair", display: "block" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && !readOnly && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            Hier unterschreiben
          </div>
        )}
      </div>
      {!readOnly && hasSignature && (
        <button
          onClick={clear}
          className="mt-1.5 text-xs"
          style={{ color: "var(--destructive)" }}
        >
          Löschen
        </button>
      )}
    </div>
  );
}
