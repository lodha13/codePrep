
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Camera, CameraOff } from 'lucide-react';

export default function CameraView() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isCameraEnabled, setIsCameraEnabled] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // TODO: Add logic to save the camera footage.
        async function enableCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setIsCameraEnabled(true);
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setError("Camera access was denied. Please enable camera permissions in your browser settings to continue.");
                setIsCameraEnabled(false);
            }
        }

        enableCamera();

        // Cleanup function to stop the camera stream when the component unmounts
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <Card className="fixed bottom-4 right-4 w-48 h-36 bg-gray-900 text-white shadow-lg z-50 flex items-center justify-center overflow-hidden">
            {error ? (
                <div className="p-4 text-center text-xs text-red-400">
                    <CameraOff className="h-6 w-6 mx-auto mb-2" />
                    {error}
                </div>
            ) : (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isCameraEnabled ? 'opacity-100' : 'opacity-0'}`}
                />
            )}
            {!isCameraEnabled && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-xs">
                    <Camera className="h-6 w-6 animate-pulse" />
                    <p className="mt-1">Starting camera...</p>
                </div>
            )}
        </Card>
    );
}
