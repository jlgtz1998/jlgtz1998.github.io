'use client';

interface MaterialIconProps {
  name: string;
  size?: number;
  className?: string;
  ariaHidden?: boolean;
}

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 2,
};

function iconPath(name: string) {
  switch (name) {
    case 'more_vert':
      return <><circle cx="12" cy="5" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="19" r="1.4" fill="currentColor" /></>;
    case 'settings':
    case 'gear':
      return <><circle cx="12" cy="12" r="3" {...common} /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" {...common} /></>;
    case 'light_mode':
    case 'wb_sunny':
      return <><circle cx="12" cy="12" r="4" {...common} /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" {...common} /></>;
    case 'dark_mode':
      return <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" {...common} />;
    case 'lock':
      return <><rect x="5" y="10" width="14" height="10" rx="2" {...common} /><path d="M8 10V7a4 4 0 0 1 8 0v3" {...common} /></>;
    case 'lock_open':
      return <><rect x="5" y="10" width="14" height="10" rx="2" {...common} /><path d="M8 10V7a4 4 0 0 1 7.2-2.4" {...common} /></>;
    case 'drag_indicator':
      return <>{[7, 12, 17].flatMap((y) => [<circle key={`l${y}`} cx="9" cy={y} r="1.1" fill="currentColor" />, <circle key={`r${y}`} cx="15" cy={y} r="1.1" fill="currentColor" />])}</>;
    case 'keyboard_arrow_left':
      return <path d="M15 5 8 12l7 7" {...common} />;
    case 'keyboard_arrow_right':
      return <path d="m9 5 7 7-7 7" {...common} />;
    case 'explore':
      return <><circle cx="12" cy="12" r="9" {...common} /><path d="m15.5 8.5-2.2 5-4.8 2 2.2-5 4.8-2Z" {...common} /></>;
    case 'auto_awesome':
      return <><path d="m12 3 1.5 5.1L18.5 10l-5 1.9L12 17l-1.5-5.1-5-1.9 5-1.9L12 3Z" {...common} /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" {...common} /></>;
    case 'refresh':
    case 'progress_activity':
      return <><path d="M20 12a8 8 0 0 1-13.6 5.7M4 12A8 8 0 0 1 17.6 6.3" {...common} /><path d="M17 2v5h5M7 22v-5H2" {...common} /></>;
    case 'download':
      return <><path d="M12 3v11" {...common} /><path d="m7 10 5 5 5-5" {...common} /><path d="M5 21h14" {...common} /></>;
    case 'content_copy':
      return <><rect x="8" y="8" width="11" height="13" rx="2" {...common} /><path d="M5 16V5a2 2 0 0 1 2-2h9" {...common} /></>;
    case 'check':
      return <path d="m5 12 4 4L19 6" {...common} />;
    case 'picture_as_pdf':
      return <><rect x="5" y="3" width="14" height="18" rx="2" {...common} /><path d="M8 16h8M8 12h8M8 8h5" {...common} /></>;
    case 'image':
      return <><rect x="4" y="5" width="16" height="14" rx="2" {...common} /><path d="m7 16 4-4 3 3 2-2 3 3" {...common} /><circle cx="9" cy="9" r="1" fill="currentColor" /></>;
    case 'data_object':
      return <path d="M8 7 4 12l4 5M16 7l4 5-4 5M13 5l-2 14" {...common} />;
    case 'css':
      return <><path d="M5 5h14l-1.2 14L12 21l-5.8-2L5 5Z" {...common} /><path d="M9 9h6l-.4 6-2.6.8-2.6-.8" {...common} /></>;
    case 'layers':
      return <><path d="m12 3 9 5-9 5-9-5 9-5Z" {...common} /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" {...common} /></>;
    case 'speaker':
      return <><rect x="7" y="3" width="10" height="18" rx="2" {...common} /><circle cx="12" cy="9" r="2" {...common} /><circle cx="12" cy="16" r="3" {...common} /></>;
    case 'chair':
      return <><path d="M7 4h10v8H7zM6 12h12M8 12v8M16 12v8" {...common} /></>;
    case 'straighten':
      return <><rect x="4" y="8" width="16" height="8" rx="2" {...common} /><path d="M7 8v3M10 8v2M13 8v3M16 8v2" {...common} /></>;
    case 'coffee_maker':
      return <><path d="M7 5h9v14H7zM16 8h3v6h-3M9 3h5" {...common} /><path d="M9 15h5" {...common} /></>;
    case 'article':
      return <><rect x="5" y="3" width="14" height="18" rx="2" {...common} /><path d="M8 8h8M8 12h8M8 16h5" {...common} /></>;
    case 'dashboard':
      return <><rect x="4" y="4" width="7" height="7" rx="1" {...common} /><rect x="13" y="4" width="7" height="7" rx="1" {...common} /><rect x="4" y="13" width="7" height="7" rx="1" {...common} /><rect x="13" y="13" width="7" height="7" rx="1" {...common} /></>;
    case 'web':
      return <><rect x="4" y="5" width="16" height="14" rx="2" {...common} /><path d="M4 9h16" {...common} /></>;
    case 'inventory_2':
      return <><path d="M4 7h16v14H4zM4 7l2-4h12l2 4M9 12h6" {...common} /></>;
    case 'undo':
      return <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" fill="currentColor" />;
    case 'redo':
      return <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22l2.36.78C5.03 12.8 8.03 10.5 11.5 10.5c1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" fill="currentColor" />;
    case 'arrow_drop_down':
      return <path d="m7 10 5 5 5-5H7z" fill="currentColor" />;
    case 'tune':
      return <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 12h6" {...common} />;
    case 'add':
      return <path d="M12 5v14M5 12h14" {...common} />;
    case 'close':
      return <path d="M18 6 6 18M6 6l12 12" {...common} />;
    case 'delete':
    case 'trash':
      return <><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" {...common} /></>;
    default:
      return <circle cx="12" cy="12" r="8" {...common} />;
  }
}

export default function MaterialIcon({
  name,
  size = 18,
  className = '',
  ariaHidden = true,
}: MaterialIconProps) {
  return (
    <svg
      aria-hidden={ariaHidden}
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      {iconPath(name)}
    </svg>
  );
}
