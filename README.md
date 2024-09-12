# `ng-comp-fn`

A utility for building Angular components as functions.

> This project heavily borrows code from [Analog](https://github.com/analogjs/analog).
> 
> Moreover, this project is a proof of concept and is not intended for production use.

## Install

```shell
yarn add vite-plugin-ng-comp-fn ng-comp-fn
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

## Usage

```ts
import {Component} from "ng-comp-fn";
import {effect, signal} from "@angular/core";

// Accepts all Angular @Component options
export default Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <button (click)="add()">{{count}}</button>
  `
})(() => {
  // All variables declared here are exposed to the template
  const count = signal(0);

  // So are functions
  function add() {
    const one = 123;
    count.set(count() + 1);
  }

  // Effects are also supported without needing a variable
  effect(() => {
    console.log(count());
  })
})
```
