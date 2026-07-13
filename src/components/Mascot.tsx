interface MascotProps {
  size?: number;
  className?: string;
  /** Accessible label; omit (empty) to mark decorative. */
  title?: string;
}

/**
 * Elatime's friendly bear mascot — a self-contained SVG teddy face.
 * Used in the header, empty states, and the map loading placeholder.
 */
export default function Mascot({ size = 40, className, title = "Elatime bear" }: MascotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ears */}
      <circle cx="16" cy="16" r="10" fill="#d98e5a" />
      <circle cx="48" cy="16" r="10" fill="#d98e5a" />
      <circle cx="16" cy="16" r="5" fill="#ffb4a2" />
      <circle cx="48" cy="16" r="5" fill="#ffb4a2" />
      {/* head */}
      <circle cx="32" cy="34" r="22" fill="#e8a56d" />
      {/* snout */}
      <ellipse cx="32" cy="40" rx="12" ry="9.5" fill="#fbe7d2" />
      {/* eyes */}
      <circle cx="24" cy="31" r="3.2" fill="#2c2a3a" />
      <circle cx="40" cy="31" r="3.2" fill="#2c2a3a" />
      <circle cx="25.1" cy="29.9" r="1" fill="#ffffff" />
      <circle cx="41.1" cy="29.9" r="1" fill="#ffffff" />
      {/* nose + smile */}
      <ellipse cx="32" cy="37" rx="3.2" ry="2.4" fill="#2c2a3a" />
      <path
        d="M27 41.5c1.6 2.2 3.1 3.2 5 3.2s3.4-1 5-3.2"
        fill="none"
        stroke="#2c2a3a"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* cheeks */}
      <circle cx="20.5" cy="38" r="2.6" fill="#ff9d9d" opacity="0.7" />
      <circle cx="43.5" cy="38" r="2.6" fill="#ff9d9d" opacity="0.7" />
    </svg>
  );
}
