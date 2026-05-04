/**
 * contact controller
 */

import { escapeHtml, textToHtml } from '../../../utils/html';
import {
  rejectTurnstileFailure,
  verifyTurnstileToken,
} from '../../../utils/turnstile';

type ContactBody = {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  turnstileToken?: unknown;
};

type ContactContext = {
  request: {
    body?: ContactBody;
    ip?: string;
  };
  ip?: string;
  badRequest: (message: string) => unknown;
  internalServerError: (message: string) => unknown;
  send: (body: unknown) => void;
  status?: number;
  body?: unknown;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeText = (value: unknown, maxLength: number): string =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

export default {
  async send(ctx: ContactContext) {
    const payload = ctx.request.body || {};
    const name = normalizeText(payload.name, 120);
    const email = normalizeText(payload.email, 254).toLowerCase();
    const subject = normalizeText(payload.subject, 160);
    const message = normalizeText(payload.message, 5000);

    if (!name || !email || !message) {
      return ctx.badRequest('Wymagane pola: imię, email i wiadomość.');
    }

    if (!emailPattern.test(email)) {
      return ctx.badRequest('Niepoprawny format adresu e-mail.');
    }

    const turnstileResult = await verifyTurnstileToken(
      payload.turnstileToken,
      ctx.ip || ctx.request.ip,
    );
    if (turnstileResult.ok === false) {
      return rejectTurnstileFailure(ctx, turnstileResult);
    }

    try {
      // Send email using Strapi email plugin
      await strapi
        .plugin('email')
        .service('email')
        .send({
          to: process.env.CONTACT_EMAIL || 'kontakt@star-sign.pl',
          from: process.env.EMAIL_FROM || 'no-reply@star-sign.pl',
          replyTo: email,
          subject: `[Kontakt Star Sign] ${subject || 'Nowa wiadomość'}`,
          text: `Od: ${name} (${email})\n\nWiadomość:\n${message}`,
          html: `
          <h3>Nowa wiadomość z formularza kontaktowego</h3>
          <p><strong>Od:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
          <p><strong>Temat:</strong> ${escapeHtml(subject || 'Brak')}</p>
          <p><strong>Wiadomość:</strong></p>
          <p>${textToHtml(message)}</p>
        `,
        });

      ctx.send({ success: true, message: 'Wiadomość została wysłana.' });
    } catch (err) {
      strapi.log.error('Błąd wysyłania maila kontaktowego:', err);
      ctx.internalServerError(
        'Nie udało się wysłać wiadomości. Spróbuj ponownie później.',
      );
    }
  },
};
