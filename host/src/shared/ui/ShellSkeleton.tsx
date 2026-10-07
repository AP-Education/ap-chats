import './ShellSkeleton.css';

const NAV_WIDTHS = [96, 64, 84, 72];
const LIST_WIDTHS = [148, 120, 164, 104, 136];

function Bone({ variant, width }: { variant: string; width?: number }) {
  return (
    <span
      className={`shell-skeleton__bone shell-skeleton__bone--${variant}`}
      style={width ? { width } : undefined}
    />
  );
}

/**
 * The shell frame without content, shown until sign-in resolves. index.html
 * renders the same markup before scripts load, so there is no loading screen
 * between the first paint and the real layout.
 */
export function ShellSkeleton() {
  return (
    <div className="shell-skeleton" role="status" aria-label="Завантаження">
      <div className="shell-skeleton__sider">
        <div className="shell-skeleton__rail">
          <span className="shell-skeleton__tile" />
          <span className="shell-skeleton__rail-divider" />
          <span className="shell-skeleton__tile" />
        </div>
        <div className="shell-skeleton__panel">
          <div className="shell-skeleton__header">
            <Bone variant="title" />
          </div>
          <div className="shell-skeleton__nav">
            {NAV_WIDTHS.map((width) => (
              <div key={width} className="shell-skeleton__nav-item">
                <Bone variant="icon" />
                <Bone variant="text" width={width} />
              </div>
            ))}
          </div>
          <div className="shell-skeleton__divider" />
          <div className="shell-skeleton__list">
            {LIST_WIDTHS.map((width) => (
              <Bone key={width} variant="text" width={width} />
            ))}
          </div>
        </div>
        <div className="shell-skeleton__footer">
          <Bone variant="avatar" />
          <Bone variant="text" width={112} />
        </div>
      </div>
      <div className="shell-skeleton__content" />
    </div>
  );
}
