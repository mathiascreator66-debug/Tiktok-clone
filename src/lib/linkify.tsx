import React from "react";

const URL_RE = /(https?:\/\/[^\s<]+[^.,;:!?\s<>)")\]])/gi;
const HASH_RE = /(^|[\s])#([\p{L}\p{N}_]{1,50})/gu;
const MENTION_RE = /(^|[\s])@([a-zA-Z0-9_]{3,30})/g;

/**
 * Render text with clickable http(s) links (rel=noopener), #hashtags and @mentions.
 */
export function LinkifiedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts: React.ReactNode[] = [];
  // Combined pass: split by URLs first, then hashtags/mentions inside plain segments
  const urlChunks = text.split(URL_RE);
  let key = 0;
  for (const chunk of urlChunks) {
    if (/^https?:\/\//i.test(chunk)) {
      parts.push(
        <a
          key={key++}
          href={chunk}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#25f4ee] underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {chunk}
        </a>
      );
    } else {
      parts.push(...linkifySocial(chunk, () => key++));
    }
  }
  return <span className={className}>{parts}</span>;
}

function linkifySocial(text: string, nextKey: () => number): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Tokenize by hashtag and mention
  const re = /(#([\p{L}\p{N}_]{1,50}))|(@([a-zA-Z0-9_]{3,30}))/gu;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      const tag = m[2].toLowerCase();
      out.push(
        <a
          key={nextKey()}
          href={`/recherche?q=${encodeURIComponent("#" + tag)}`}
          className="text-[#25f4ee] font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          #{m[2]}
        </a>
      );
    } else if (m[3]) {
      out.push(
        <a
          key={nextKey()}
          href={`/profil/${m[4].toLowerCase()}`}
          className="text-[#25f4ee] font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          @{m[4]}
        </a>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// silence unused import warnings for regexes kept for documentation
void HASH_RE;
void MENTION_RE;
