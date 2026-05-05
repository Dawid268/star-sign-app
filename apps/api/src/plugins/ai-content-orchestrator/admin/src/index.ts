import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';
import { PERMISSIONS } from './permissions';
import { PLUGIN_ID } from './pluginId';

type StrapiAdminApp = {
  addMenuLink(input: unknown): void;
  registerPlugin(input: unknown): void;
};

export default {
  register(app: StrapiAdminApp) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: 'AI Content Orchestrator',
      },
      permissions: PERMISSIONS.read,
      Component: async () => {
        const { App } = await import('./pages/App');

        return {
          default: App,
        };
      },
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: true,
      name: 'AI Content Orchestrator',
    });
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);

          return { data, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};
