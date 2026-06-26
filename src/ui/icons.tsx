// 인라인 SVG 아이콘 — 텍스트 없이 아이콘 중심(디자인 가이드).
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

export function LogoMark(props: P) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      <circle cx="13" cy="13" r="13" fill="#34C7A0" />
      <path d="M8 16.5L18 8.5L13.5 18L12 13.5L8 16.5Z" fill="#fff" />
    </svg>
  )
}

export function CameraIcon(props: P) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M4 8.5C4 7.4 4.9 6.5 6 6.5H7.6L8.6 5C8.9 4.6 9.3 4.4 9.8 4.4H14.2C14.7 4.4 15.1 4.6 15.4 5L16.4 6.5H18C19.1 6.5 20 7.4 20 8.5V17C20 18.1 19.1 19 18 19H6C4.9 19 4 18.1 4 17V8.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

export function BrandIcon(props: P) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="6" fill="currentColor" />
      <path
        d="M8 15L12 8L16 15"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PinIcon(props: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 22s7-7.5 7-12.5A7 7 0 0 0 5 9.5C5 14.5 12 22 12 22Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function StepsIcon(props: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M7 14c-1.5 0-2.5-1.2-2.5-3S5 7.5 6.5 7.5 9 9 9 11c0 1.2-.3 2.5-.7 3.5M8 17.5c0 1.4.6 2.5 1.8 2.5M16.5 11c1.5 0 2.5-1.2 2.5-3S18 5 16.5 5 14 6.5 14 8.5c0 1.2.3 2.5.7 3.5M15.5 14.5c0 1.4-.6 2.5-1.8 2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ClockIcon(props: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 7.5V12l3 2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CafeIcon(props: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M5 8h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z"
        stroke="#e07a3c"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M16 9h2.2a1.8 1.8 0 0 1 0 3.6H16" stroke="#e07a3c" strokeWidth="1.6" />
      <path d="M8 3.5v2M11 3.5v2" stroke="#e07a3c" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function ForkIcon(props: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M7 3.5v6M7 9.5a2 2 0 0 0 2-2v-4M7 9.5v11M17 3.5c-1.4 0-2.5 1.6-2.5 4S15.6 12 17 12m0-8.5V20"
        stroke="#e07a3c"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function VoiceOnIcon(props: P) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M4 9.5v5h3l4.5 3.5v-12L7 9.5H4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M15.5 8.5a4.5 4.5 0 0 1 0 7M17.8 6a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function VoiceOffIcon(props: P) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M4 9.5v5h3l4.5 3.5v-12L7 9.5H4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M16 9.5l4 5M20 9.5l-4 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function TurnArrow({
  direction,
  ...props
}: P & { direction: 'left' | 'right' | 'straight' }) {
  const rotate =
    direction === 'left' ? -90 : direction === 'right' ? 90 : 0
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" {...props}>
      <g transform={`rotate(${rotate} 12 12)`}>
        <path
          d="M12 20V6M12 6l-5 5M12 6l5 5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}
