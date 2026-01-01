
'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Card } from '@/components/ui/card';
import { Camera, CameraOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CameraViewHandle {
  stopStream: () => void;
}

const CameraView = forwardRef<CameraViewHandle>((props, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const [isCameraEnabled, setIsCameraEnabled] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [position, setPosition] = useState({ x: 16, y: 80 }); // left, bottom
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const stopStream = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    useImperativeHandle(ref, () => ({
        stopStream
    }));

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

        return () => {
            stopStream();
        };
    }, []);


    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        setIsDragging(true);
        const rect = cardRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            setPosition({
                x: e.clientX - dragOffset.x,
                // To calculate the 'bottom' style, we subtract the cursor's y-position from the window height
                // and also subtract the offset from the top of the element to the mouse click.
                y: window.innerHeight - e.clientY - (cardRef.current?.offsetHeight || 0) + dragOffset.y,
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);


    return (
        <Card
            ref={cardRef}
            className={cn(
                "fixed w-48 h-36 bg-gray-900 text-white shadow-lg z-50 flex items-center justify-center overflow-hidden",
                isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
            style={{
                left: `${position.x}px`,
                bottom: `${position.y}px`,
            }}
            onMouseDown={handleMouseDown}
        >
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
                <div className="absolute inset-0 flex flex-col items-center justify-center text-xs pointer-events-none">
                    <Camera className="h-6 w-6 animate-pulse" />
                    <p className="mt-1">Starting camera...</p>
                </div>
            )}
        </Card>
    );
});

CameraView.displayName = 'CameraView';
export default CameraView;
