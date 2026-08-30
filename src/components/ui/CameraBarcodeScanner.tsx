"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CameraOff, RefreshCw, Zap, ZapOff, AlertCircle } from "lucide-react";
import { soundEffects } from "@/lib/sound-effects";

export interface CameraBarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (errorMessage: string) => void;
  isActive?: boolean;
  onToggleActive?: (active: boolean) => void;
  cooldownMs?: number;
  singleScan?: boolean;
  playFeedback?: boolean;
  qrbox?: { width: number; height: number };
  containerId?: string;
  className?: string;
}

export function CameraBarcodeScanner({
  onScan,
  onError,
  isActive = true,
  onToggleActive,
  cooldownMs = 1500,
  singleScan = false,
  playFeedback = true,
  qrbox = { width: 280, height: 140 },
  containerId = "html5-barcode-scanner",
  className = "",
}: CameraBarcodeScannerProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  // References
  const html5QrCodeRef = useRef<any>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedTextRef = useRef<string>("");
  const isMountedRef = useRef<boolean>(true);

  // Cooldown & Scan handler
  const handleDecodedText = useCallback(
    (decodedText: string) => {
      const now = Date.now();
      const cleanText = decodedText.trim();
      if (!cleanText) return;

      // Check cooldown for continuous scan
      const timeSinceLast = now - lastScanTimeRef.current;
      const isSameCode = cleanText === lastScannedTextRef.current;

      if (isSameCode && timeSinceLast < cooldownMs) {
        return; // Ignore repetitive frames of identical barcode within cooldown
      }

      lastScanTimeRef.current = now;
      lastScannedTextRef.current = cleanText;
      setLastScannedCode(cleanText);

      // Play feedback sound and vibration
      if (playFeedback) {
        soundEffects.playSuccessBeep();
      }

      // Invoke callback
      onScan(cleanText);

      // If single scan mode, stop scanner
      if (singleScan && html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(() => {});
          }
        } catch {}
      }
    },
    [cooldownMs, onScan, playFeedback, singleScan]
  );

  // Start Scanner
  const startScanner = useCallback(async () => {
    if (!isMountedRef.current) return;
    setCameraError(null);
    setIsInitializing(true);

    try {
      // Dynamic import to prevent SSR issues
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

      if (!isMountedRef.current) return;

      // Stop existing instance if running
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          await html5QrCodeRef.current.clear();
        } catch (e) {
          console.warn("Cleanup error before start:", e);
        }
      }

      const scanner = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
        ],
        verbose: false,
      });

      html5QrCodeRef.current = scanner;

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const w = Math.min(viewfinderWidth * 0.85, qrbox.width || 280);
          const h = Math.min(viewfinderHeight * 0.65, qrbox.height || 140);
          return { width: Math.floor(w), height: Math.floor(h) };
        },
        aspectRatio: 1.777778,
      };

      await scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText: string) => {
          handleDecodedText(decodedText);
        },
        (_errorMessage: string) => {
          // Frame decode error / no code in frame, silent
        }
      );

      if (isMountedRef.current) {
        setIsStarted(true);
        setIsInitializing(false);

        // Check if flashlight (torch) feature is supported by camera capabilities
        try {
          const capabilities = scanner.getRunningTrackCapabilities();
          if (capabilities && (capabilities as any).torch) {
            setTorchAvailable(true);
          }
        } catch {
          setTorchAvailable(false);
        }
      }
    } catch (err: any) {
      console.error("Camera scanner start error:", err);
      if (isMountedRef.current) {
        setIsInitializing(false);
        setIsStarted(false);
        let msg = "Não foi possível acessar a câmera do dispositivo.";
        if (err?.name === "NotAllowedError" || err?.includes?.("Permission")) {
          msg = "Permissão de câmera negada. Conceda permissão no navegador para escanear.";
        } else if (err?.name === "NotFoundError") {
          msg = "Nenhuma câmera traseira encontrada no dispositivo.";
        }
        setCameraError(msg);
        if (onError) onError(msg);
      }
    }
  }, [containerId, handleDecodedText, onError, qrbox.height, qrbox.width]);

  // Stop Scanner
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Scanner stop error:", err);
      }
    }
    if (isMountedRef.current) {
      setIsStarted(false);
      setIsInitializing(false);
      setTorchOn(false);
    }
  }, []);

  // Toggle Torch (Flashlight)
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !torchAvailable) return;
    try {
      const nextState = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn("Torch error:", e);
    }
  };

  // Mount/Unmount and isActive effect
  useEffect(() => {
    isMountedRef.current = true;

    if (isActive) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      isMountedRef.current = false;
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(() => {});
          }
        } catch {}
      }
    };
  }, [isActive, startScanner, stopScanner]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-stone-950 border border-stone-800 shadow-xl ${className}`}
    >
      {/* Scanner container for html5-qrcode DOM injection */}
      <div id={containerId} className="w-full overflow-hidden [&_video]:object-cover" />

      {/* Viewfinder Overlay */}
      {isStarted && !cameraError && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
          {/* Aiming Reticle */}
          <div
            className="relative border-2 border-gold-400/80 rounded-xl bg-gold-500/5 shadow-[0_0_15px_rgba(201,168,76,0.3)] transition-all flex items-center justify-center overflow-hidden"
            style={{
              width: `${Math.min(qrbox.width, 280)}px`,
              height: `${Math.min(qrbox.height, 140)}px`,
            }}
          >
            {/* Animated Laser Scanning Beam */}
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-gold-300 to-transparent shadow-[0_0_8px_#F59E0B] animate-[scanLaser_2s_ease-in-out_infinite]" />

            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-gold-300 rounded-tl" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-gold-300 rounded-tr" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-gold-300 rounded-bl" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-gold-300 rounded-br" />
          </div>

          <p className="mt-3 text-[11px] font-medium text-stone-300 bg-stone-900/85 px-3 py-1 rounded-full border border-stone-700/60 backdrop-blur-sm">
            Posicione o código de barras ou QR na mira
          </p>
        </div>
      )}

      {/* Loading State */}
      {isInitializing && (
        <div className="absolute inset-0 bg-stone-950/90 flex flex-col items-center justify-center gap-3 p-6 text-center z-10">
          <div className="w-10 h-10 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-stone-200">Iniciando câmera...</p>
          <p className="text-xs text-stone-400">Solicitando acesso à câmera traseira</p>
        </div>
      )}

      {/* Inactive / Paused State */}
      {!isActive && !isInitializing && (
        <div className="p-8 flex flex-col items-center justify-center text-center bg-stone-950 min-h-[180px]">
          <div className="w-12 h-12 rounded-2xl bg-stone-900 flex items-center justify-center mb-3 text-stone-400">
            <CameraOff className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-stone-200 mb-1">Câmera Pausada</p>
          <p className="text-xs text-stone-400 max-w-xs mb-4">
            O leitor de código está desligado para economizar bateria.
          </p>
          {onToggleActive && (
            <button
              onClick={() => onToggleActive(true)}
              className="px-4 py-2 rounded-xl gold-gradient text-white text-xs font-bold shadow-gold flex items-center gap-2 hover:shadow-gold-lg transition-all"
            >
              <Camera className="w-4 h-4" />
              Ligar Leitor
            </button>
          )}
        </div>
      )}

      {/* Camera Error State */}
      {cameraError && (
        <div className="p-6 flex flex-col items-center justify-center text-center bg-stone-950 min-h-[200px] z-10">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3 text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-rose-400 mb-1">Erro na Câmera</p>
          <p className="text-xs text-stone-300 max-w-xs mb-4">{cameraError}</p>
          <button
            onClick={startScanner}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-semibold flex items-center gap-2 transition-all border border-stone-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Controls & Badges Bar (Overlay Top) */}
      {isStarted && (
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20 pointer-events-auto">
          {/* Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900/80 backdrop-blur-md border border-stone-700/50 text-[10px] font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Leitor Ativo
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {torchAvailable && (
              <button
                onClick={toggleTorch}
                className={`p-1.5 rounded-lg border backdrop-blur-md transition-all ${
                  torchOn
                    ? "bg-amber-400/20 border-amber-400 text-amber-300"
                    : "bg-stone-900/80 border-stone-700/50 text-stone-300 hover:text-white"
                }`}
                title={torchOn ? "Desligar lanterna" : "Ligar lanterna"}
              >
                {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            {onToggleActive && (
              <button
                onClick={() => onToggleActive(false)}
                className="p-1.5 rounded-lg bg-stone-900/80 border border-stone-700/50 text-stone-300 hover:text-white backdrop-blur-md transition-all text-xs"
                title="Pausar Câmera"
              >
                <CameraOff className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Last Scanned Code Pill (Overlay Bottom) */}
      {lastScannedCode && isStarted && (
        <div className="absolute bottom-2 left-2 right-2 text-center pointer-events-none">
          <span className="inline-block px-3 py-1 rounded-full bg-stone-900/90 border border-gold-500/40 text-[10px] font-mono text-gold-300 backdrop-blur-md shadow-lg animate-fade-in">
            Último: {lastScannedCode}
          </span>
        </div>
      )}
    </div>
  );
}
