import Image from "next/image";

import { cn } from "cn";

/** The Vero mark. Decorative by default because it always sits next to the word "Vero". */
export function VeroLogo({ className, alt = "" }: { className?: string; alt?: string }) {
  return <Image src="/vero-logo.svg" alt={alt} width={36} height={36} className={cn("size-6 shrink-0", className)} />;
}
