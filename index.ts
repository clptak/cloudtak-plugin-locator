import type { App } from 'vue';
import { defineAsyncComponent, defineComponent, h, markRaw, onMounted } from 'vue';
import { IconDeviceMobilePin } from '@tabler/icons-vue';
import type { PluginAPI, PluginInstance, PluginStatic } from '@tak-ps/cloudtak';
import { useAppStore } from '@/stores/app.ts';
import MenuTemplate from './lib/MenuTemplate.vue';
import {
    bindFloatMinimize,
    cleanupFloatMinimize,
    openDesktopPane,
} from './lib/floatMinimize.ts';
import { bindPopout, closePopout } from './lib/popout.ts';
import {
    LocatorHistoryMapSync,
    setLocatorHistoryMapSync,
} from './lib/locator-history-map-sync.ts';
import { useLocatorStore } from './stores/plugin-state.ts';

const LocatorFloatShell = defineAsyncComponent(
    () => import('./components/LocatorFloatShell.vue'),
);
const LocatorPane = defineAsyncComponent(
    () => import('./components/LocatorPane.vue'),
);
const LocatorTaskbarChip = defineAsyncComponent(
    () => import('./components/LocatorTaskbarChip.vue'),
);

const MENU_KEY = 'locator';
const ROUTE_NAME = 'home-menu-locator';
const ROUTE_PATH = 'locator';

export default class LocatorPlugin implements PluginInstance {
    api: PluginAPI;
    private historyMapSync: LocatorHistoryMapSync | null = null;

    constructor(api: PluginAPI) {
        this.api = api;
    }

    static async install(_app: App, api: PluginAPI): Promise<PluginInstance> {
        return new LocatorPlugin(api);
    }

    async enable(): Promise<void> {
        const api = this.api;
        const store = useLocatorStore(api.pinia);
        store.setEnabled(true);

        this.historyMapSync = new LocatorHistoryMapSync(api.pinia);
        setLocatorHistoryMapSync(this.historyMapSync);
        this.historyMapSync.start();

        bindPopout(api);

        bindFloatMinimize({
            api,
            shell: LocatorFloatShell as unknown as HostFloatComponent,
            restoreChip: LocatorTaskbarChip as unknown as HostBottomBarComponent,
        });

        api.routes.add({
            path: ROUTE_PATH,
            name: ROUTE_NAME,
            component: defineComponent({
                name: 'LocatorEntry',
                setup() {
                    const appStore = useAppStore(api.pinia);
                    onMounted(() => {
                        if (!appStore.isMobileDetected) {
                            openDesktopPane();
                            void api.router.replace({ name: 'home' });
                        }
                    });
                    return () => {
                        if (appStore.isMobileDetected) {
                            return h(MenuTemplate, { name: 'Locator' }, {
                                header: () => [
                                    h(IconDeviceMobilePin, { size: 22, stroke: '1.5', class: 'flex-shrink-0' }),
                                    h('span', { class: 'fw-semibold ms-2' }, 'Locator'),
                                ],
                                default: () => h(LocatorPane),
                            });
                        }
                        return null;
                    };
                },
            }),
        }, 'home-menu');

        api.menu.add({
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
        this.historyMapSync?.stop();
        this.historyMapSync = null;
        setLocatorHistoryMapSync(null);
        this.api.menu.remove(MENU_KEY);
        closePopout();
        cleanupFloatMinimize();
        if (this.api.router.hasRoute(ROUTE_NAME)) {
            this.api.router.removeRoute(ROUTE_NAME);
        }
    }
}

type MenuItemIconType = NonNullable<Parameters<PluginAPI['menu']['add']>[0]['icon']>;
type MenuItemConfig = Parameters<PluginAPI['menu']['add']>[0];
type HostFloatComponent = Parameters<PluginAPI['float']['add']>[0]['component'];
type HostBottomBarComponent = Parameters<PluginAPI['bottomBar']['add']>[0]['component'];

export const _typecheck: PluginStatic = LocatorPlugin;
