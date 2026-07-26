type LanguageFlagProps = {
  flagCode: string;
  title: string;
  className?: string;
};

/** Compact local SVG flags — no remote assets, no emoji. */
export default function LanguageFlag({
  flagCode,
  title,
  className = "",
}: LanguageFlagProps) {
  const code = flagCode.toLowerCase();

  return (
    <svg
      viewBox="0 0 24 16"
      width="22"
      height="15"
      className={`shrink-0 overflow-hidden rounded-[2px] shadow-sm ${className}`}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {renderFlag(code)}
    </svg>
  );
}

function renderFlag(code: string) {
  switch (code) {
    case "fr":
      return (
        <>
          <rect width="8" height="16" fill="#002395" />
          <rect x="8" width="8" height="16" fill="#fff" />
          <rect x="16" width="8" height="16" fill="#ED2939" />
        </>
      );
    case "gb":
      return (
        <>
          <rect width="24" height="16" fill="#012169" />
          <path d="M0 0 L24 16 M24 0 L0 16" stroke="#fff" strokeWidth="3" />
          <path d="M0 0 L24 16 M24 0 L0 16" stroke="#C8102E" strokeWidth="1.5" />
          <path d="M12 0 V16 M0 8 H24" stroke="#fff" strokeWidth="5" />
          <path d="M12 0 V16 M0 8 H24" stroke="#C8102E" strokeWidth="2.5" />
        </>
      );
    case "de":
      return (
        <>
          <rect width="24" height="5.34" fill="#000" />
          <rect y="5.34" width="24" height="5.33" fill="#D00" />
          <rect y="10.67" width="24" height="5.33" fill="#FFCE00" />
        </>
      );
    case "es":
      return (
        <>
          <rect width="24" height="16" fill="#AA151B" />
          <rect y="4" width="24" height="8" fill="#F1BF00" />
        </>
      );
    case "it":
      return (
        <>
          <rect width="8" height="16" fill="#009246" />
          <rect x="8" width="8" height="16" fill="#fff" />
          <rect x="16" width="8" height="16" fill="#CE2B37" />
        </>
      );
    case "pt":
      return (
        <>
          <rect width="24" height="16" fill="#FF0000" />
          <rect width="9.6" height="16" fill="#006600" />
          <circle cx="9.6" cy="8" r="3.2" fill="#FFCC00" />
        </>
      );
    case "nl":
      return (
        <>
          <rect width="24" height="5.34" fill="#AE1C28" />
          <rect y="5.34" width="24" height="5.33" fill="#fff" />
          <rect y="10.67" width="24" height="5.33" fill="#21468B" />
        </>
      );
    case "pl":
      return (
        <>
          <rect width="24" height="8" fill="#fff" />
          <rect y="8" width="24" height="8" fill="#DC143C" />
        </>
      );
    case "ro":
      return (
        <>
          <rect width="8" height="16" fill="#002B7F" />
          <rect x="8" width="8" height="16" fill="#FCD116" />
          <rect x="16" width="8" height="16" fill="#CE1126" />
        </>
      );
    case "gr":
      return (
        <>
          <rect width="24" height="16" fill="#0D5EAF" />
          {[1, 3, 5, 7].map((row) => (
            <rect key={row} y={row * 1.78} width="24" height="1.78" fill="#fff" />
          ))}
          <rect width="9.5" height="8.9" fill="#0D5EAF" />
          <rect x="3.6" width="2.3" height="8.9" fill="#fff" />
          <rect y="3.3" width="9.5" height="2.3" fill="#fff" />
        </>
      );
    case "cz":
      return (
        <>
          <rect width="24" height="8" fill="#fff" />
          <rect y="8" width="24" height="8" fill="#D7141A" />
          <path d="M0 0 L12 8 L0 16 Z" fill="#11457E" />
        </>
      );
    case "dk":
      return (
        <>
          <rect width="24" height="16" fill="#C8102E" />
          <rect x="7" width="3" height="16" fill="#fff" />
          <rect y="6.5" width="24" height="3" fill="#fff" />
        </>
      );
    case "se":
      return (
        <>
          <rect width="24" height="16" fill="#006AA7" />
          <rect x="7" width="3" height="16" fill="#FECC00" />
          <rect y="6.5" width="24" height="3" fill="#FECC00" />
        </>
      );
    case "fi":
      return (
        <>
          <rect width="24" height="16" fill="#fff" />
          <rect x="7" width="3.5" height="16" fill="#003580" />
          <rect y="6.25" width="24" height="3.5" fill="#003580" />
        </>
      );
    case "hu":
      return (
        <>
          <rect width="24" height="5.34" fill="#CE2939" />
          <rect y="5.34" width="24" height="5.33" fill="#fff" />
          <rect y="10.67" width="24" height="5.33" fill="#477050" />
        </>
      );
    case "sk":
      return (
        <>
          <rect width="24" height="5.34" fill="#fff" />
          <rect y="5.34" width="24" height="5.33" fill="#0B4EA2" />
          <rect y="10.67" width="24" height="5.33" fill="#EE1C25" />
          <path d="M4 4.5 h3.5 v7 H4 Z" fill="#fff" />
          <path d="M3 6.5 h5.5" stroke="#EE1C25" strokeWidth="1.4" />
        </>
      );
    case "si":
      return (
        <>
          <rect width="24" height="5.34" fill="#fff" />
          <rect y="5.34" width="24" height="5.33" fill="#0000FF" />
          <rect y="10.67" width="24" height="5.33" fill="#FF0000" />
          <circle cx="5" cy="4.2" r="1.6" fill="#FFD700" />
        </>
      );
    case "hr":
      return (
        <>
          <rect width="24" height="5.34" fill="#FF0000" />
          <rect y="5.34" width="24" height="5.33" fill="#fff" />
          <rect y="10.67" width="24" height="5.33" fill="#171796" />
          <rect x="3" y="3.5" width="5" height="4" fill="#fff" stroke="#171796" strokeWidth="0.4" />
        </>
      );
    case "bg":
      return (
        <>
          <rect width="24" height="5.34" fill="#fff" />
          <rect y="5.34" width="24" height="5.33" fill="#00966E" />
          <rect y="10.67" width="24" height="5.33" fill="#D62612" />
        </>
      );
    case "lt":
      return (
        <>
          <rect width="24" height="5.34" fill="#FDB913" />
          <rect y="5.34" width="24" height="5.33" fill="#006A44" />
          <rect y="10.67" width="24" height="5.33" fill="#C1272D" />
        </>
      );
    case "lv":
      return (
        <>
          <rect width="24" height="16" fill="#9E3039" />
          <rect y="6.4" width="24" height="3.2" fill="#fff" />
        </>
      );
    case "ee":
      return (
        <>
          <rect width="24" height="5.34" fill="#0072CE" />
          <rect y="5.34" width="24" height="5.33" fill="#000" />
          <rect y="10.67" width="24" height="5.33" fill="#fff" />
        </>
      );
    case "mt":
      return (
        <>
          <rect width="12" height="16" fill="#fff" />
          <rect x="12" width="12" height="16" fill="#CF142B" />
          <rect x="2" y="2" width="3" height="3" fill="#CCC" stroke="#999" strokeWidth="0.3" />
        </>
      );
    case "ie":
      return (
        <>
          <rect width="8" height="16" fill="#169B62" />
          <rect x="8" width="8" height="16" fill="#fff" />
          <rect x="16" width="8" height="16" fill="#FF883E" />
        </>
      );
    default:
      return <rect width="24" height="16" fill="#9aa0a6" />;
  }
}
