import type { Copy } from "@/lib/copy"

// Adapted from the Uiverse.io button by 0xnihilism for provider attribution.
export function PoweredByAnthropic({ copy }: { copy: Copy["PRIVACY_COPY"] }) {
  return (
    <a
      className="group relative flex size-[76px] shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-[#1f1f1e] bg-[#cc9b7a] text-[#1f1f1e] no-underline shadow-[3px_3px_0_#1f1f1e] transition-[transform,box-shadow] duration-300 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[5px_5px_0_#1f1f1e] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#1f1f1e] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transform-none motion-reduce:transition-none"
      href="https://www.anthropic.com/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={copy.providerLabel}
    >
      <span className="block size-10 transition-transform duration-300 group-hover:-translate-y-3 group-hover:scale-75 group-hover:rotate-12 group-focus-visible:-translate-y-3 group-focus-visible:scale-75 group-focus-visible:rotate-12 motion-reduce:transform-none motion-reduce:transition-none [@media(hover:none)]:-translate-y-3 [@media(hover:none)]:scale-75" aria-hidden="true">
        <svg className="block size-full" viewBox="0 0 512 512" focusable="false">
          <rect x="0" y="0" width="512" height="512" rx="105" fill="#CC9B7A" />
          <path d="M318.663 149.787h-43.368l78.952 212.423 43.368.004-78.952-212.427zm-125.326 0l-78.952 212.427h44.255l15.932-44.608 82.846-.004 16.107 44.612h44.255l-79.126-212.427h-45.317zm-4.251 128.341l26.91-74.701 27.083 74.701h-53.993z" fill="#1F1F1E" />
        </svg>
      </span>
      <span className="absolute inset-x-0 bottom-1 flex flex-col items-center text-center text-[9px] leading-tight opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100 motion-reduce:transition-none">
        <span>{copy.poweredBy}</span>
        <strong className="text-[10px] tracking-[.01em]">{copy.provider}</strong>
      </span>
    </a>
  )
}
