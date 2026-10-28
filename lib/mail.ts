import { EmailApp } from '@/lib/types';

export const EMAIL_APP_LABEL: Record<EmailApp, string> = {
  default: 'My default mail app',
  gmail: 'Gmail',
  outlook: 'Outlook.com',
};

/** The web address (or mailto link) that opens a new message with everything filled in. */
export function buildMailUrl(app: EmailApp, to: string, subject: string, body: string): string {
  const e = encodeURIComponent;
  if (app === 'gmail') {
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${e(to)}&su=${e(subject)}&body=${e(body)}`;
  }
  if (app === 'outlook') {
    return `https://outlook.live.com/mail/0/deeplink/compose?to=${e(to)}&subject=${e(subject)}&body=${e(body)}`;
  }
  return `mailto:${e(to)}?subject=${e(subject)}&body=${e(body.replace(/\n/g, '\r\n'))}`;
}

export function openedMessage(app: EmailApp): string {
  if (app === 'gmail') return 'Gmail opened with the message ready. Send it there (sign in to Gmail first if asked), then come back here.';
  if (app === 'outlook') return 'Outlook opened with the message ready. Send it there, then come back here.';
  return 'Your email app opened. Send the message there, then come back here.';
}
