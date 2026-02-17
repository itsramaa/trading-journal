/**
 * Deriverse "D" logo as SVG — fully transparent background
 * Geometric "D" with angular fintech aesthetic
 */
export function DeriverseIcon({ className = "h-8 w-8", ...props }: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Main D shape - angular geometric */}
      <path
        d="M12 8h24l16 24-16 24H12V8z"
        fill="hsl(var(--primary))"
        opacity="0.9"
      />
      {/* Inner cutout for D hole */}
      <path
        d="M20 18h14l9 14-9 14H20V18z"
        fill="hsl(var(--background))"
      />
      {/* Accent bar on left */}
      <rect x="12" y="8" width="6" height="48" rx="1" fill="hsl(var(--primary))" />
      {/* Small accent notch */}
      <rect x="20" y="8" width="10" height="5" rx="1" fill="hsl(var(--primary))" opacity="0.7" />
    </svg>
  );
}
