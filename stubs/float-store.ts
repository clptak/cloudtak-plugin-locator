/** Typecheck stub; runtime uses CloudTAK src/stores/float.ts */
import type { Component } from 'vue';

type Pane = {
    uid: string;
    name?: string;
    component: Component;
    config: Record<string, unknown>;
    height: number;
    width: number;
    x: number;
    y: number;
};

export function useFloatStore(_pinia?: unknown): {
    panes: Map<string, Pane>;
    add(opts: {
        uid: string;
        name?: string;
        component: Component;
        config?: Record<string, unknown>;
        height?: number;
        width?: number;
        x?: number;
        y?: number;
    }): Pane;
    delete(uid: string): void;
} {
    void _pinia;
    throw new Error('stub');
}
