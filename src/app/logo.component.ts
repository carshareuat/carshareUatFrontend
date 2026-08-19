import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="carShare"
      [class]="'app-logo ' + (variant === 'light' ? 'app-logo--light' : 'app-logo--dark')"
    >
      <defs>
        <linearGradient id="cs-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset="1" stop-color="#eef2ff"/>
        </linearGradient>
        <linearGradient id="cs-car" x1="8" y1="12" x2="56" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#6366f1"/>
          <stop offset=".55" stop-color="#8b5cf6"/>
          <stop offset="1" stop-color="#ec4899"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#cs-bg)" stroke="#e5e7eb" stroke-width="1"/>
      <circle cx="32" cy="32" r="24" fill="none" stroke="url(#cs-car)" stroke-width="3"/>
      <path d="M17 36c0-1.1.9-2 2-2h1.6l2.2-5.2A4 4 0 0 1 26.5 26h11a4 4 0 0 1 3.7 2.8L43.4 34H45a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2v1.5a2.5 2.5 0 1 1-5 0V43H26v1.5a2.5 2.5 0 1 1-5 0V43h-2a2 2 0 0 1-2-2v-5z" fill="url(#cs-car)"/>
      <path d="M24.6 34 26.4 29.5A2 2 0 0 1 28.3 28h7.4a2 2 0 0 1 1.9 1.5L39.4 34H24.6z" fill="#ffffff" opacity=".92"/>
      <circle cx="23.5" cy="41" r="2.6" fill="#0f172a"/>
      <circle cx="40.5" cy="41" r="2.6" fill="#0f172a"/>
      <circle cx="23.5" cy="41" r="1" fill="#ffffff"/>
      <circle cx="40.5" cy="41" r="1" fill="#ffffff"/>
      <path d="M12 32a20 20 0 0 1 6-14" fill="none" stroke="url(#cs-car)" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>
      <path d="M52 32a20 20 0 0 1-6 14" fill="none" stroke="url(#cs-car)" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>
    </svg>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; justify-content: center; line-height: 0; }
    .app-logo { display: block; border-radius: 14px; filter: drop-shadow(0 6px 18px rgba(15,23,42,0.25)); }
    .app-logo--light { background: transparent; }
  `]
})
export class LogoComponent {
  @Input() size: number | string = 44;
  @Input() variant: 'light' | 'dark' = 'light';
}
