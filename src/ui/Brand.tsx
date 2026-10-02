/** Wortmarke im BeReal-Stil: fett, weiß, mit Punkt. */
export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`logo logo-${size}`}>BeerReal.</span>;
}

/** Rundes Profilbild mit Initialen (BeReal zeigt hier Fotos). */
export function Avatar({ name, size = 36, me = false }: { name: string; size?: number; me?: boolean }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className={`avatar ${me ? 'me' : ''}`} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </span>
  );
}

/** Der runde Auslöser-Button aus der BeReal-Kamera. */
export function Shutter({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div className="shutter-wrap">
      <button className="shutter" aria-label={label} onClick={onClick} disabled={disabled}>
        <span />
      </button>
      <span className="shutter-label">{label}</span>
    </div>
  );
}

/** Push-Benachrichtigung im iOS-Stil – wie „⚠️ Time to BeReal. ⚠️“. */
export function Notification({ title, children, right }: { title: string; children?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="notif">
      <span className="notif-icon">🍺</span>
      <div className="notif-body">
        <div className="notif-top">
          <strong>BeerReal</strong>
          <span className="notif-right">{right ?? 'jetzt'}</span>
        </div>
        <div className="notif-title">{title}</div>
        {children}
      </div>
    </div>
  );
}
