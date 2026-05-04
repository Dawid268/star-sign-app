import { invalidateHttpCacheTags } from '../../../../utils/http-cache';

const invalidate = async (): Promise<void> => {
  await invalidateHttpCacheTags(['articles']);
};

export default {
  async afterCreate() {
    await invalidate();
  },
  async afterUpdate() {
    await invalidate();
  },
  async afterDelete() {
    await invalidate();
  },
};
