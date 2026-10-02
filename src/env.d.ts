import 'react';
declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}
declare global {
  interface Navigator {
    standalone?: boolean;
  }
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: string }>;
  }
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
