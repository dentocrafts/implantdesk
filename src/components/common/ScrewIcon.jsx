/**
 * Custom screw icon styled to match lucide-react conventions.
 * Drop-in replacement: <ScrewIcon className="h-4 w-4" />
 */
export default function ScrewIcon({ className, size, strokeWidth = 2, ...props }) {
  const s = size ? `${size}px` : undefined;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={s}
      height={s}
      className={className}
      {...props}
    >
      {/* Head (flat/pan) */}
      <rect x="7" y="2" width="10" height="4" rx="1.5" />
      {/* Screwdriver slot */}
      <line x1="12" y1="2" x2="12" y2="6" />
      {/* Shaft */}
      <rect x="10" y="6" width="4" height="12" rx="0.5" />
      {/* Thread lines */}
      <line x1="10" y1="9"  x2="14" y2="10" />
      <line x1="10" y1="12" x2="14" y2="13" />
      <line x1="10" y1="15" x2="14" y2="16" />
      {/* Tapered tip */}
      <path d="M10 18 L12 22 L14 18" />
    </svg>
  );
}
