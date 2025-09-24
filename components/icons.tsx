import { type SVGProps } from "react";

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M10.75 3a.75.75 0 0 0-1.5 0v6.25H3a.75.75 0 0 0 0 1.5h6.25V17a.75.75 0 0 0 1.5 0v-6.25H17a.75.75 0 0 0 0-1.5h-6.25z" />
    </svg>
  );
}

export function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.25 11.25v3.75m0-7.5h.008v.008H11.25zm9 3.75a8.25 8.25 0 1 1-16.5 0 8.25 8.25 0 0 1 16.5 0z"
      />
    </svg>
  );
}

export function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 9.75 12 12.75 15 9.75m-3 3V4.5m8.25 8.25v3.75a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25v-3.75"
      />
    </svg>
  );
}
