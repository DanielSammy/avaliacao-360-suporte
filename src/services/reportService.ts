import { BASE_URL, API_ENDPOINTS, getAuthToken } from '@/config/apiConfig';

export interface EmailOptions {
  to: string;
  subject: string;
  content: string;
  isHtml?: boolean;
  smtpHost?: string;
  smtpPort?: number | string;
  smtpUser?: string;
  smtpPassword?: string;
}

/**
 * Envia um e-mail com anexo (multipart/form-data) para o endpoint definido em API_ENDPOINTS.EMAIL_SEND
 * Retorna o Response do fetch para o chamador tratar status/corpo.
 */
export async function sendEmailWithAttachment(opts: EmailOptions, file: Blob, fileName: string): Promise<Response> {
  const form = new FormData();
  form.append('smtpUser', opts.smtpUser ?? '');
  form.append('smtpPassword', opts.smtpPassword ?? '');
  form.append('smtpHost', opts.smtpHost ?? '');
  if (opts.smtpPort !== undefined && opts.smtpPort !== null) form.append('smtpPort', String(opts.smtpPort));
  form.append('subject', opts.subject);
  form.append('isHtml', String(opts.isHtml ?? true));
  form.append('content', opts.content);
  form.append('to', opts.to);
  form.append('attachments', file, fileName);

  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const resp = await fetch(`${BASE_URL}${API_ENDPOINTS.EMAIL_SEND}`, {
    method: 'POST',
    headers,
    body: form,
  });

  return resp;
}

/**
 * Envia um e-mail simples (JSON). Útil para testes de SMTP.
 */
export async function sendEmailSimple(opts: EmailOptions): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const body = {
    to: opts.to,
    subject: opts.subject,
    content: opts.content,
    isHtml: opts.isHtml ?? true,
    smtpHost: opts.smtpHost,
    smtpPort: opts.smtpPort,
    smtpUser: opts.smtpUser,
    smtpPassword: opts.smtpPassword,
  };

  const resp = await fetch(`${BASE_URL}${API_ENDPOINTS.EMAIL_SEND}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return resp;
}
