import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  X, 
  Check, 
  Barcode as BarcodeIcon, 
  AlertCircle, 
  RefreshCw,
  Zap,
  Volume2,
  VolumeX,
  Package,
  Plus,
  ArrowRight,
  Search,
  CheckCircle2,
  Sparkles,
  Upload,
  SwitchCamera,
  Layers,
  Info,
  CheckSquare,
  FileImage
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Material, Language } from '../types';
import { translations } from '../i18n/translations';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (barcode: string, foundMaterial?: Material) => void;
  materials: Material[];
  lang: Language;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanResult,
  materials,
  lang,
}) => {
  const t = translations[lang];
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scannedResult, setScannedResult] = useState<{
    code: string;
    material?: Material;
  } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isFileScanning, setIsFileScanning] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readerElementId = 'html5-barcode-reader-view';

  // Crisp audio feedback beep on barcode detection
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // AudioContext silenced or muted
    }
  };

  const handleBarcodeDetected = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    playBeep();
    if (navigator.vibrate) {
      try {
        navigator.vibrate(80);
      } catch (e) {}
    }

    const found = materials.find(
      (m) => m.barcode.trim() === cleanCode || m.sku.toLowerCase() === cleanCode.toLowerCase()
    );

    setScannedResult({ code: cleanCode, material: found });
  };

  // Safe camera starter
  const startCamera = async (cameraIdOverride?: string) => {
    setCameraError(null);
    setIsScanning(true);

    try {
      // Discover available cameras
      let cameras: Array<{ id: string; label: string }> = [];
      try {
        cameras = await Html5Qrcode.getCameras();
        setAvailableCameras(cameras);
      } catch (camErr) {
        console.warn('Could not list cameras:', camErr);
      }

      // Ensure old scanner is cleared
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
        scannerRef.current = null;
      }

      // Instantiate new Html5Qrcode instance
      const scanner = new Html5Qrcode(readerElementId);
      scannerRef.current = scanner;

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE,
      ];

      // Camera selector priority: override -> selected -> back camera by facingMode
      const camChoice = cameraIdOverride || selectedCameraId;
      const cameraConfig = camChoice
        ? camChoice
        : { facingMode: 'environment' };

      await scanner.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.floor(Math.min(minEdge * 0.9, 320)),
              height: Math.floor(Math.min(minEdge * 0.6, 200)),
            };
          },
        },
        (decodedText) => {
          handleBarcodeDetected(decodedText);
        },
        () => {
          // Normal frame loop when no barcode is in frame
        }
      );

      setCameraActive(true);
      setIsScanning(false);
    } catch (err: any) {
      console.warn('Barcode camera start error:', err);
      setIsScanning(false);
      setCameraActive(false);
      
      const errString = String(err?.message || err);
      if (errString.includes('NotAllowedError') || errString.includes('Permission')) {
        setCameraError(
          lang === 'ar'
            ? 'تم رفض إذن الوصول للكاميرا. يرجى تفعيل إذن الكاميرا من إعدادات المتصفح، أو استخدام ميزة التقاط/رفع صورة الباركود أدناه.'
            : 'Camera permission denied. Please allow camera access in browser settings or use image file scan below.'
        );
      } else {
        setCameraError(
          lang === 'ar'
            ? 'تعذر الوصول المباشر لكاميرا الويب. يمكنك استخدام التقاط صورة للباركود أو القارئ الخارجي (USB).'
            : 'Unable to open camera feed. You can upload an image or scan with an external USB reader.'
        );
      }
    }
  };

  // Safe camera stopper
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
    setIsScanning(false);
  };

  // Image File Barcode Scan (works in all browsers / mobile snapshot without live video constraint!)
  const handleImageFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileScanning(true);
    setCameraError(null);

    try {
      // Temporarily stop camera if active
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      const tempScanner = scannerRef.current || new Html5Qrcode(readerElementId);
      scannerRef.current = tempScanner;

      const decodedText = await tempScanner.scanFile(file, false);
      if (decodedText) {
        handleBarcodeDetected(decodedText);
      }
    } catch (err: any) {
      console.warn('File barcode scan error:', err);
      setCameraError(
        lang === 'ar'
          ? 'لم يتم التعرف على أي باركود في الصورة المختارة. يرجى التأكد من وضوح خطوط الباركود والإضاءة.'
          : 'No valid barcode detected in the selected image. Please make sure the barcode is clear.'
      );
    } finally {
      setIsFileScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      setScannedResult(null);
      setManualCode('');
      setCameraError(null);

      // Auto start camera with slight delay to ensure DOM element is mounted
      const timer = setTimeout(() => {
        startCamera();
      }, 200);

      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  // Clean up when unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Physical Barcode Gun Keyboard Listener (Fast keystrokes ending in Enter)
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is manually typing in text inputs
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime > 150) {
        buffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          handleBarcodeDetected(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, materials]);

  if (!isOpen) return null;

  const handleConfirmAndApply = () => {
    if (scannedResult) {
      onScanResult(scannedResult.code, scannedResult.material);
      stopCamera();
      onClose();
    }
  };

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeDetected(manualCode.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <BarcodeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  {lang === 'ar' ? 'قارئ ومسح الباركود' : 'Barcode Scanner'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{lang === 'ar' ? 'نظام المسح مفعل' : 'Scanner Active'}</span>
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                {lang === 'ar'
                  ? 'يدعم كاميرا الهاتف والكمبيوتر، رفع صورة الباركود، وقارئ الباركود اللاسلكي (USB)'
                  : 'Supports live camera, barcode photo capture, and wireless USB scanner guns'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border text-xs transition-colors ${
                soundEnabled
                  ? 'border-neutral-700 bg-neutral-800 text-amber-400'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-500'
              }`}
              title={soundEnabled ? 'صوت التنبيه مفعل' : 'صوت التنبيه مكتوم'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 text-neutral-400 hover:text-white rounded-lg bg-neutral-800/80 hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Camera Viewport Area */}
          <div className="relative w-full aspect-[4/3] sm:aspect-video bg-neutral-950 rounded-xl border-2 border-neutral-800 overflow-hidden flex flex-col items-center justify-center shadow-inner">
            
            {/* CRITICAL: html5-barcode-reader-view container is ALWAYS mounted and sized */}
            <div
              id={readerElementId}
              className="w-full h-full object-cover"
              style={{ minHeight: '220px' }}
            />

            {/* Viewfinder Target Laser Overlay when camera is active */}
            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 bg-transparent">
                {/* Targeting Frame Box */}
                <div className="relative w-64 h-36 border-2 border-amber-400/80 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.35)] flex items-center justify-center overflow-hidden">
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-amber-400" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-amber-400" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-amber-400" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-amber-400" />

                  {/* Red Laser Bar Animation */}
                  <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse" />
                </div>

                <div className="mt-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur border border-neutral-700/80 text-[11px] text-neutral-200 flex items-center gap-1.5 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{lang === 'ar' ? 'وجّه الكاميرا نحو الباركود (EAN-13 / UPC / QR)' : 'Point camera at barcode'}</span>
                </div>
              </div>
            )}

            {/* Overlay when Camera is NOT active */}
            {!cameraActive && (
              <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
                <div className="w-12 h-12 rounded-xl bg-neutral-800/80 border border-neutral-700 flex items-center justify-center text-neutral-400">
                  <Camera className="w-6 h-6 text-amber-400" />
                </div>

                {cameraError ? (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 max-w-sm leading-relaxed text-right">
                    <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>تنبيه الكاميرا:</span>
                    </div>
                    {cameraError}
                  </div>
                ) : (
                  <div className="text-xs text-neutral-400 max-w-xs">
                    {isScanning
                      ? (lang === 'ar' ? 'جاري فتح الكاميرا وتجهيز ماسح الباركود...' : 'Initializing camera scanner...')
                      : (lang === 'ar' ? 'الكاميرا جاهزة للتشغيل أو المسح الفوري' : 'Camera ready to start')}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    disabled={isScanning}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-md"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>{isScanning ? 'جاري الفتح...' : 'تشغيل كاميرا المسح'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isFileScanning}
                    className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <FileImage className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isFileScanning ? 'جاري فحص الصورة...' : 'مسح من صورة / لقطة'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Camera Controls Bar (Switch Camera / Image Upload) */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 text-[11px] font-medium">خيارات المسح السريع:</span>

              {availableCameras.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <SwitchCamera className="w-3.5 h-3.5 text-neutral-400" />
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedCameraId(id);
                      startCamera(id);
                    }}
                    className="bg-neutral-900 border border-neutral-700 text-[11px] text-neutral-200 rounded px-2 py-1 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">الكاميرا الافتراضية (الخلفية)</option>
                    {availableCameras.map((cam, idx) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label || `كاميرا ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Hidden file input for barcode image upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageFileScan}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isFileScanning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-[11px] font-medium transition-colors"
                title="التقاط أو رفع صورة للباركود"
              >
                <Upload className="w-3 h-3 text-amber-400" />
                <span>{isFileScanning ? 'جاري فحص الصورة...' : 'التقاط صورة للباركود'}</span>
              </button>

              {cameraActive && (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-medium transition-colors"
                >
                  إيقاف الكاميرا
                </button>
              )}
            </div>
          </div>

          {/* Scanned Result Card Preview (when barcode is detected!) */}
          {scannedResult && (
            <div className="p-4 rounded-xl bg-neutral-950 border-2 border-emerald-500/70 shadow-xl space-y-3 animate-scale-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-white">
                    تم التقاط الباركود بنجاح!
                  </span>
                </div>
                <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/40">
                  {scannedResult.code}
                </span>
              </div>

              {scannedResult.material ? (
                <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                        <span>{scannedResult.material.name}</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                          مادة مسجلة
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {scannedResult.material.nameFr} · كود المادة: {scannedResult.material.sku}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-white bg-neutral-800 px-2.5 py-1 rounded border border-neutral-700 shrink-0">
                      {scannedResult.material.purchasePrice} {t.currency}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-neutral-300 pt-2 border-t border-neutral-800/80">
                    <div className="p-2 rounded bg-neutral-950/80 border border-neutral-800">
                      <span className="text-[10px] text-neutral-400 block">المخزون المتوفر حالياً:</span>
                      <strong className="text-amber-400 font-mono text-sm">
                        {scannedResult.material.currentStock} {scannedResult.material.unit}
                      </strong>
                    </div>
                    <div className="p-2 rounded bg-neutral-950/80 border border-neutral-800">
                      <span className="text-[10px] text-neutral-400 block">حد الأمان الأدنى:</span>
                      <strong className="text-neutral-200 font-mono text-sm">
                        {scannedResult.material.minStock} {scannedResult.material.unit}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-bold">باركود جديد غير مسجل في المخزون!</div>
                    <div className="text-[11px] text-amber-400/80">
                      يمكنك حفظه وإضافته كمادة جديدة في المخزون بضغطة زر واحدة.
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 px-2.5 py-1 rounded text-amber-200 font-bold shrink-0">
                    مادة جديدة
                  </span>
                </div>
              )}

              {/* Action Buttons on Result */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmAndApply}
                  className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {scannedResult.material
                      ? 'تأكيد واستعراض بطاقة المادة في المخزن'
                      : 'إضافة مادة جديدة بهذا الباركود'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setScannedResult(null)}
                  className="py-2.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 transition-colors"
                >
                  مسح باركود آخر
                </button>
              </div>
            </div>
          )}

          {/* Manual Barcode Input & External Scanner */}
          <form onSubmit={handleManualSubmit} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-neutral-300">
                إدخال الباركود يدوياً أو بواسطة قارئ الباركود الخارجي (USB/Bluetooth):
              </label>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>قارئ الباركود جاهز</span>
              </span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="مثال: 6131112223334 أو كود SKU..."
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 font-mono tabular-nums tracking-wider"
                />
              </div>

              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-md"
              >
                <Search className="w-3.5 h-3.5" />
                <span>بحث وفحص</span>
              </button>
            </div>
          </form>

          {/* Quick Selection Samples for Instant Testing */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <div className="text-[11px] font-semibold text-neutral-400 flex items-center justify-between">
              <span>أو اختر باركود سريعاً من المواد للتجربة الفورية:</span>
              <span className="text-[10px] text-neutral-500">اضغط للمسح التلقائي</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {materials.slice(0, 6).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleBarcodeDetected(m.barcode)}
                  className="flex items-center justify-between p-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800/80 text-right transition-colors group"
                >
                  <div className="truncate text-xs text-neutral-200">
                    <span className="font-semibold group-hover:text-amber-400 transition-colors">
                      {m.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2 shrink-0 border border-amber-500/20">
                    {m.barcode}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>نظام التعرف التلقائي الذكي نشط ومحمي</span>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-3.5 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
