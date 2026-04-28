import type { Strapi } from '../types';

const encryption = ({ strapi }: { strapi: Strapi }) => ({
  encrypt(value: string): string {
    const token = value.trim();

    if (!token) {
      throw new Error('Token LLM nie może być pusty.');
    }

    return strapi.service('admin::encryption').encrypt(token);
  },

  decrypt(value: string): string {
    if (!value) {
      throw new Error('Brak zaszyfrowanego tokena LLM.');
    }

    return strapi.service('admin::encryption').decrypt(value);
  },
});

export default encryption;
