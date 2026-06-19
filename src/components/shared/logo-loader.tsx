import Image from 'next/image';

interface LogoLoaderProps {
  text?: string;
  className?: string;
}

export function LogoLoader({ text = 'Loading…', className = '' }: LogoLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className="animate-logo-pulse">
        <Image src="/chartix-wordmark.png" alt="Chartix" width={120} height={31} priority />
      </div>
      <div className="relative h-0.5 w-40 overflow-hidden rounded-full bg-zinc-100">
        <div className="absolute h-full w-2/5 animate-bar-slide rounded-full bg-emerald-600" />
      </div>
      {text && (
        <p className="text-[11px] font-semibold tracking-wide text-zinc-400">{text}</p>
      )}
    </div>
  );
}

export function PageLoader({ text }: { text?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <LogoLoader text={text} />
    </div>
  );
}
