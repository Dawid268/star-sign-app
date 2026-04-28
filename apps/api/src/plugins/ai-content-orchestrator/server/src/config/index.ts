import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from '../constants';

export default {
  default: {
    timezone: DEFAULT_TIMEZONE,
    locale: DEFAULT_LOCALE,
  },
  validator(config: unknown) {
    return config;
  },
};
