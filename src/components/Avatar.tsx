type Props = {
  username: string;
  avatarUrl?: string | null;
  size?: number;
  isPro?: boolean;
};

export default function Avatar({
  username,
  avatarUrl,
  size = 40,
  isPro = false,
}: Props) {
  const initial = username.charAt(0).toUpperCase();
  const badge = Math.max(12, Math.round(size * 0.28));
  const inner = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt={username}
      width={size}
      height={size}
      className="rounded-full object-cover border-2 border-white"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-full bg-gradient-to-br from-[#fe2c55] to-[#25f4ee] flex items-center justify-center font-bold text-white border-2 border-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );

  if (!isPro) return inner;

  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      {inner}
      <span
        className="absolute -bottom-0.5 -right-0.5 rounded-full bg-amber-400 text-black font-bold flex items-center justify-center border border-black/40 shadow"
        style={{ width: badge, height: badge, fontSize: badge * 0.45 }}
        title="AfriVoix Pro"
        aria-label="Pro"
      >
        Pro
      </span>
    </span>
  );
}
