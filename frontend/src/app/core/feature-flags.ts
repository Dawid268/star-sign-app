import { environment } from '../../environments/environment';

export const featureFlags = {
  shopEnabled: Boolean(environment.features.shopEnabled),
  adsEnabled: Boolean(environment.features.adsEnabled),
};
