import { BadgeCheck } from "lucide-react";

type Props = {
  size?: number;
  className?: string;
};

/** Badge « Compte certifié » — checkmark next to display name / username. */
export default function VerifiedBadge({ size = 16, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center shrink-0 text-[#20d5ec] ${className}`}
      title="Compte certifié"
      aria-label="Compte certifié"
    >
      <BadgeCheck size={size} className="fill-[#20d5ec] text-black" strokeWidth={1.5} />
    </span>
  );
}
