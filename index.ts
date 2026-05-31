import type { App } from 'vue';
import { defineAsyncComponent, markRaw } from 'vue';
import { IconDeviceMobilePin } from '@tabler/icons-vue';
import type { PluginAPI, PluginInstance, PluginStatic } from '@tak-ps/cloudtak';
import { useLocatorStore } from './stores/plugin-state.ts';

const MenuLocator = defineAsyncComponent(() => import('./components/MenuLocator.vue'));

const MENU_KEY = 'locator';
const ROUTE_NAME = 'home-menu-locator';
const ROUTE_PATH = 'locator';

export default class LocatorPlugin implements PluginInstance {
    api: PluginAPI;

    constructor(api: PluginAPI) {
        this.api = api;
    }

    static async install(_app: App, api: PluginAPI): Promise<PluginInstance> {
        api.routes.add({
            path: ROUTE_PATH,
            name: ROUTE_NAME,
            component: MenuLocator,
        }, 'home-menu');

        return new LocatorPlugin(api);
    }

    async enable(): Promise<void> {
        const store = useLocatorStore(this.api.pinia);
        store.setEnabled(true);

        this.api.menu.add({
            key: MENU_KEY,
            label: 'Locator',
            route: ROUTE_NAME,
            tooltip: 'Cellphone ping, SMS locator, and TAK Portal settings',
            description: 'Cell ping, missing-person SMS locator via TAK Portal',
            icon: markRaw(IconDeviceMobilePin) as unknown as MenuItemIconType,
        } as MenuItemConfig);
    }

    async disable(): Promise<void> {
        const store = useLocatorStore(this.api.pinia);
        store.setEnabled(false);
        this.api.menu.remove(MENU_KEY);
    }
}

type MenuItemIconType = NonNullable<Parameters<PluginAPI['menu']['add']>[0]['icon']>;
type MenuItemConfig = Parameters<PluginAPI['menu']['add']>[0];

export const _typecheck: PluginStatic = LocatorPlugin;
