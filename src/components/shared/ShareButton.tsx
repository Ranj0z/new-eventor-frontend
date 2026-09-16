import { useState } from "react";
import { Share2, Copy, Check, ExternalLink, MessageCircle } from "lucide-react";

type ShareButtonProps = {
  url: string;
  title: string;
};

// Reusable — takes only url/title, no event-specific internals. See
// eventor-frontend-plan.md §4.2.
//
// Note: lucide-react no longer ships brand/logo icons (Facebook, LinkedIn,
// Instagram, etc. were removed over trademark concerns), so those rows use
// a generic ExternalLink icon plus the platform name in text instead of a
// wordmark.
export default function ShareButton({ url, title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — nothing more we
      // can do here; the dropdown stays open so the person can select the
      // link text manually if they need to.
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      // User cancelled the native share sheet, or it isn't actually
      // supported despite the feature check — either way, no-op.
    }
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="dropdown dropdown-end">
      <button tabIndex={0} type="button" className="btn btn-outline btn-sm gap-2">
        <Share2 size={15} /> Share
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box border border-base-300 shadow-md p-2 w-56 z-10"
      >
        {canNativeShare && (
          <li>
            <button type="button" onClick={handleNativeShare}>
              <Share2 size={15} /> Share...
            </button>
          </li>
        )}
        <li>
          <button type="button" onClick={handleCopy}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied!" : "Copy link"}
          </button>
        </li>
        <li>
          <a
            href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={15} /> WhatsApp
          </a>
        </li>
        <li>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={15} /> Facebook
          </a>
        </li>
        <li>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={15} /> LinkedIn
          </a>
        </li>
        <li>
          {/* Instagram has no web share-intent URL — copy the link instead
              and say so, rather than pretending this opens Instagram. */}
          <button type="button" onClick={handleCopy} className="flex-col items-start !items-start">
            <span className="flex items-center gap-2">
              <ExternalLink size={15} /> Instagram
            </span>
            <span className="text-xs opacity-60 pl-[23px]">No direct share — link copied instead</span>
          </button>
        </li>
      </ul>
    </div>
  );
}