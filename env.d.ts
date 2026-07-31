/// <reference types="vue/macros-global" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    const component: DefineComponent<object, object, unknown>;
    export default component;
}

declare module '@tak-ps/cloudtak' {
    import type { App } from 'vue';
    import type { Pinia } from 'pinia';
    import type { Router } from 'vue-router';
    import type { Component } from 'vue';

    export type MenuItemConfig = {
        key: string;
        label: string;
        route: string;
        tooltip: string;
        description?: string;
        icon: Component;
    };

    export type BottomBarItemConfig = {
        key: string;
        component: Component;
    };

    export interface PluginAPI {
        menu: {
            add(item: MenuItemConfig): void;
            remove(key: string): void;
        };
        routes: {
            add(
                route: { path: string; name: string; component: unknown },
                parentName?: string,
            ): void;
        };
        float: {
            add(opts: {
                uid: string;
                name?: string;
                component: Component;
                actions?: Component;
                props?: Record<string, unknown>;
                height?: number;
                width?: number;
                x?: number;
                y?: number;
            }): unknown;
            remove(uid: string): void;
            has(uid: string): boolean;
        };
        bottomBar: {
            add(item: BottomBarItemConfig): void;
            remove(key: string): void;
        };
        pinia: Pinia;
        router: Router;
    }

    export interface PluginInstance {
        enable(): Promise<void>;
        disable(): Promise<void>;
    }

    export interface PluginStatic {
        install(app: App, api: PluginAPI): PluginInstance | Promise<PluginInstance>;
    }
}
