type Props = {
  size?: number;
  className?: string;
};

/**
 * Badge « Compte certifié » style TikTok :
 * pastille cyan claire + coche blanche, alignée à côté du @pseudo.
 */
export default function VerifiedBadge({ size = 16, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 align-middle ${className}`}
      title="Compte certifié"
      aria-label="Compte certifié"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <circle cx="12" cy="12" r="12" fill="#20D5EC" />
        <path
          d="M7.2 12.2l3.1 3.1 6.5-6.6"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
