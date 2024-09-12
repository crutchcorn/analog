# `vite-plugin-ng-comp-fn`

A Vite plugin for building Angular components as functions.

## Install

```shell
yarn add vite-plugin-ng-comp-fn
```

## Setup

Add the plugin to the `plugins` array in your Vite config

```ts
import { defineConfig } from 'vite';
import angularFn from 'vite-plugin-ng-comp-fn';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    mainFields: ['module'],
  },

  plugins: [
    angularFn({
      experimental: {
        supportFunctionComponents: true,
      },
    }),
  ],
});
```
