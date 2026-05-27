export default function DentalPlaceholder({ className = 'h-full w-full' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Implant component placeholder"
    >
      <rect width="120" height="120" fill="hsl(142 30% 96%)" />
      {/* Implant post */}
      <rect x="52" y="20" width="16" height="50" rx="3" fill="hsl(142 40% 78%)" />
      <rect x="50" y="20" width="20" height="8" rx="2" fill="hsl(142 50% 68%)" />
      <rect x="48" y="65" width="24" height="6" rx="1" fill="hsl(142 40% 72%)" />
      {/* Thread lines */}
      <rect x="52" y="30" width="16" height="1.5" rx="0.5" fill="hsl(142 30% 88%)" />
      <rect x="52" y="35" width="16" height="1.5" rx="0.5" fill="hsl(142 30% 88%)" />
      <rect x="52" y="40" width="16" height="1.5" rx="0.5" fill="hsl(142 30% 88%)" />
      <rect x="52" y="45" width="16" height="1.5" rx="0.5" fill="hsl(142 30% 88%)" />
      <rect x="52" y="50" width="16" height="1.5" rx="0.5" fill="hsl(142 30% 88%)" />
      <rect x="52" y="55" width="16" height="1.5" rx="0.5" fill="hsl(142 30% 88%)" />
      {/* Crown */}
      <path
        d="M42 80 Q60 72 78 80 L75 100 Q60 108 45 100 Z"
        fill="hsl(142 40% 72%)"
        stroke="hsl(142 50% 62%)"
        strokeWidth="1"
      />
      {/* Highlight */}
      <path
        d="M50 83 Q60 78 70 83"
        stroke="hsl(142 60% 55%)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
