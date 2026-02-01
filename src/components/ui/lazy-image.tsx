/**
 * LazyImage - Image component with lazy loading and error handling
 * Uses IntersectionObserver to only load images when they're visible
 */
import { useState } from "react";
import { useInView } from "react-intersection-observer";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackIcon?: React.ReactNode;
}

export function LazyImage({ 
  src, 
  alt, 
  className, 
  containerClassName,
  fallbackIcon,
  ...props 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "100px",
  });

  return (
    <div ref={ref} className={cn("relative", containerClassName)}>
      {!inView ? (
        <Skeleton className="w-full h-full" />
      ) : hasError ? (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          {fallbackIcon ?? <ImageOff className="h-6 w-6 text-muted-foreground" />}
        </div>
      ) : (
        <>
          {!isLoaded && <Skeleton className="w-full h-full absolute inset-0" />}
          <img
            src={src}
            alt={alt}
            className={cn(
              className,
              "transition-opacity duration-300",
              !isLoaded && "opacity-0"
            )}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            {...props}
          />
        </>
      )}
    </div>
  );
}
