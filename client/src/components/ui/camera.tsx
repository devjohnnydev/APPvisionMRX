import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface CameraProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  isActive?: boolean;
}

const Camera = forwardRef<HTMLVideoElement, CameraProps>(
  ({ className, isActive = false, ...props }, ref) => {
    return (
      <video
        ref={ref}
        className={cn(
          "w-full h-full object-cover",
          !isActive && "opacity-50",
          className
        )}
        autoPlay
        playsInline
        muted
        {...props}
      />
    );
  }
);

Camera.displayName = "Camera";

export { Camera };
