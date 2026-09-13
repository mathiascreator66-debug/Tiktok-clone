type Props = {
  username: string;
  avatarUrl?: string | null;
  size?: number;
  /** kept for API compat — badge certifié is shown next to the name, not on the avatar */
  isPro?: boolean;
};

export default function Avatar({
  username,
  avatarUrl,
  size = 40,
}: Props) {
  const initial = username.charAt(0).toUpperCase();
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={username}
        width={size}
        height={size}
        className="rounded-full object-cover border-2 border-white"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-[#fe2c55] to-[#25f4ee] flex items-center justify-center font-bold text-white border-2 border-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}
