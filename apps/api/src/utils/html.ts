const htmlEscapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => htmlEscapeMap[char]);

export const textToHtml = (value: string): string =>
  escapeHtml(value).replace(/\r?\n/g, '<br>');
