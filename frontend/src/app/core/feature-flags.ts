import { environment } from '../../environments/environment';

export const featureFlags = {
  shopEnabled: Boolean(environment.features.shopEnabled),
};
