import { factories } from '@strapi/strapi';
import { isShopEnabled } from '../../../utils/features';

export default factories.createCoreController('api::product.product', () => ({
  async find(ctx) {
    if (!isShopEnabled()) {
      return ctx.notFound('Sklep jest tymczasowo wyłączony.');
    }

    return super.find(ctx);
  },

  async findOne(ctx) {
    if (!isShopEnabled()) {
      return ctx.notFound('Sklep jest tymczasowo wyłączony.');
    }

    return super.findOne(ctx);
  },
}));
