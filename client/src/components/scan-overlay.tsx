import React from 'react';
import { cn } from '@/lib/utils';

interface ScanOverlayProps {
  isScanning?: boolean;
  progress?: number;
  onCapture?: () => void;
  className?: string;
}

const ScanOverlay: React.FC<ScanOverlayProps> = ({
  isScanning = false,
  progress = 0,
  onCapture,
  className,
}) => {
  return (
    <div className={cn("absolute inset-0 z-10", className)}>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      {/* Scan frame */}
      <div className="flex-1 flex items-center justify-center px-8 h-full">
        <div className="relative">
          {/* Main scan frame */}
          <div className={cn(
            "w-64 h-48 rounded-2xl relative border-2",
            isScanning 
              ? "border-primary shadow-[0_0_20px_rgba(0,200,81,0.6)] animate-pulse" 
              : "border-primary shadow-[0_0_20px_rgba(0,200,81,0.3)]"
          )}>
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-primary rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-primary rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-primary rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-primary rounded-br-2xl" />
            
            {/* Center crosshair */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-6 h-0.5 bg-primary" />
              <div className="w-0.5 h-6 bg-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>
          
          {/* Instructions */}
          <div className="text-center mt-6">
            <p className="text-white text-lg font-medium mb-2">
              {isScanning ? "Analisando placa..." : "Posicione a placa no quadro"}
            </p>
            <p className="text-white/70 text-sm">
              {isScanning 
                ? "Aguarde enquanto a IA processa a imagem" 
                : "Mantenha a câmera estável para melhor reconhecimento"
              }
            </p>
          </div>
        </div>
      </div>

      {/* AI Status */}
      {isScanning && (
        <div className="absolute bottom-32 left-6 right-6">
          <div className="bg-black/50 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                <span className="text-white font-medium">IA Processando...</span>
              </div>
              <span className="text-primary text-sm font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-white/70 text-sm mt-2">Analisando componentes eletrônicos...</p>
          </div>
        </div>
      )}

      {/* Capture button */}
      {!isScanning && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
          <button 
            onClick={onCapture}
            data-testid="button-capture"
            className="w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          >
            <div className="w-16 h-16 border-4 border-primary-foreground rounded-full flex items-center justify-center">
              <div className="w-12 h-12 bg-primary-foreground rounded-full" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export { ScanOverlay };
