import styles from './GifLink.module.css';

/** A GIF that cannot be shown still leaves its link, so the message is never empty. */
export function GifLink({ href }: { href: string }) {
  return (
    <a className={styles.link} href={href} target="_blank" rel="noopener noreferrer">
      {href}
    </a>
  );
}
