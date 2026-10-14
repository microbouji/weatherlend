interface Props {
  src: string | null;
  title: string;
  className?: string;
}

/** Item photo, or a labelled placeholder when the offer has none. */
export function Photo({ src, title, className = "" }: Props) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={title} className={`object-cover ${className}`} />;
  }
  return (
    <div
      className={`flex items-center justify-center bg-stone-200 text-sm text-stone-500 ${className}`}
      role="img"
      aria-label={`No photo for ${title}`}
    >
      Photo of the item
    </div>
  );
}
