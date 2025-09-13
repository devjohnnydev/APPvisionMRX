import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCamera } from '@/hooks/useCamera';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { apiRequest } from '@/lib/queryClient';
import { BottomNav } from '@/components/ui/bottom-nav';
import { Button } from '@/components/ui/button';
import { Camera } from '@/components/ui/camera';
import { ScanOverlay } from '@/components/scan-overlay';
import { ArrowLeft, Info, Image, Flashlight } from 'lucide-react';

const Scan: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [scanProgress, setScanProgress] = useState(0);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);

  const {
    videoRef,
    canvasRef,
    isStreaming,
    error: cameraError,
    startCamera,
    stopCamera,
    captureImage,
  } = useCamera();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, authLoading, toast]);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Location access denied:', error);
        }
      );
    }
  }, []);

  // Start camera when component mounts
  useEffect(() => {
    if (user) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [user, startCamera, stopCamera]);

  const scanMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const formData = new FormData();
      
      // Convert base64 to blob
      const byteCharacters = atob(imageData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      
      formData.append('image', blob, 'scan.jpg');
      
      if (userLocation) {
        formData.append('latitude', userLocation.latitude.toString());
        formData.append('longitude', userLocation.longitude.toString());
        formData.append('location', userLocation.address || 'Unknown location');
      }

      return await apiRequest('POST', '/api/scan', formData);
    },
    onSuccess: async (response) => {
      const result = await response.json();
      
      // Navigate to scan result page with the data
      setLocation(`/scan-result?id=${result.id}`);
      
      toast({
        title: "Escaneamento concluído!",
        description: `${result.boardType} identificado com ${Math.round(result.confidence * 100)}% de precisão`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Erro no escaneamento",
        description: "Falha ao processar a imagem. Tente novamente.",
        variant: "destructive",
      });
      
      setScanProgress(0);
    },
  });

  const handleCapture = () => {
    const imageData = captureImage();
    if (!imageData) {
      toast({
        title: "Erro na captura",
        description: "Não foi possível capturar a imagem. Verifique a câmera.",
        variant: "destructive",
      });
      return;
    }

    // Start scan animation
    setScanProgress(0);
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    scanMutation.mutate(imageData);
  };

  const handleGoBack = () => {
    setLocation('/dashboard');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  if (cameraError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-camera-slash text-destructive text-xl" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Erro na Câmera</h2>
          <p className="text-muted-foreground mb-6">{cameraError}</p>
          <div className="space-y-3">
            <Button onClick={startCamera} className="w-full" data-testid="button-retry-camera">
              Tentar Novamente
            </Button>
            <Button variant="outline" onClick={handleGoBack} className="w-full">
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-6 pt-3 pb-2 text-sm text-white">
        <span className="font-medium">9:41</span>
        <div className="flex items-center space-x-1">
          <i className="fas fa-signal text-xs" />
          <i className="fas fa-wifi text-xs" />
          <i className="fas fa-battery-three-quarters text-xs" />
        </div>
      </div>

      {/* Camera View */}
      <div className="absolute inset-0">
        <Camera ref={videoRef} isActive={isStreaming} />
        
        {/* Canvas for capturing images (hidden) */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Simulated camera background when not streaming */}
        {!isStreaming && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black">
            <div className="absolute inset-0 opacity-30">
              <div className="w-full h-full bg-gradient-to-r from-blue-900/20 to-green-900/20" />
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 pt-12 pb-4">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleGoBack}
          data-testid="button-back"
          className="bg-black/50 border-none text-white hover:bg-black/70"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-white text-lg font-semibold">Escanear Placa</h2>
        <Button 
          variant="secondary" 
          size="sm"
          data-testid="button-info"
          className="bg-black/50 border-none text-white hover:bg-black/70"
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {/* Scan Overlay */}
      <ScanOverlay 
        isScanning={scanMutation.isPending}
        progress={scanProgress}
        onCapture={handleCapture}
      />

      {/* Control Buttons */}
      {!scanMutation.isPending && (
        <div className="absolute bottom-32 left-0 right-0 z-30 flex items-center justify-center space-x-6">
          <Button 
            variant="secondary" 
            size="lg"
            data-testid="button-gallery"
            className="bg-white/20 border-none text-white hover:bg-white/30 backdrop-blur-sm rounded-full w-12 h-12"
          >
            <Image className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="secondary" 
            size="lg"
            data-testid="button-flashlight"
            className="bg-white/20 border-none text-white hover:bg-white/30 backdrop-blur-sm rounded-full w-12 h-12"
          >
            <Flashlight className="h-5 w-5" />
          </Button>
        </div>
      )}

      <BottomNav className="bg-black/80 border-white/20" />
    </div>
  );
};

export default Scan;
