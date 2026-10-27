import type { Copy } from "@/lib/copy"

// Adapted from the Uiverse.io button by 0xnihilism for provider attribution.
export function PoweredByAnthropic({ copy }: { copy: Copy["PRIVACY_COPY"] }) {
  return (
    <a
      className="group relative flex size-[130px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border-[3px] border-[#1f1f1e] bg-[#cc9b7a] text-[#1f1f1e] no-underline shadow-[4px_4px_0_#1f1f1e] transition-[transform,box-shadow] duration-300 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[7px_7px_0_#1f1f1e] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1f1f1e] focus-visible:outline-3 focus-visible:outline-offset-[6px] focus-visible:outline-ring motion-reduce:transform-none motion-reduce:transition-none"
      href="https://www.anthropic.com/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={copy.providerLabel}
    >
      <span className="block size-14 transition-transform duration-300 group-hover:-translate-y-[3px] group-hover:rotate-12 group-focus-visible:-translate-y-[3px] group-focus-visible:rotate-12 motion-reduce:transform-none motion-reduce:transition-none" aria-hidden="true">
        <svg className="block size-full" viewBox="0 0 512 512" focusable="false">
          <rect x="0" y="0" width="512" height="512" rx="105" fill="#CC9B7A" />
          <path d="M318.663 149.787h-43.368l78.952 212.423 43.368.004-78.952-212.427zm-125.326 0l-78.952 212.427h44.255l15.932-44.608 82.846-.004 16.107 44.612h44.255l-79.126-212.427h-45.317zm-4.251 128.341l26.91-74.701 27.083 74.701h-53.993z" fill="#1F1F1E" />
        </svg>
      </span>
      <span className="flex flex-col items-center text-center text-xs leading-tight transition-transform duration-300 group-hover:translate-y-[2px] group-focus-visible:translate-y-[2px] motion-reduce:transform-none motion-reduce:transition-none">
        <span>{copy.poweredBy}</span>
        <strong className="text-[15px] uppercase tracking-[.04em]">{copy.provider}</strong>
      </span>
    </a>
  )
}
