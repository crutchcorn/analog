# `ng-comp-fn`

> This package must be used alongside the `vite-plugin-ng-comp-fn` Vite plugin.

A utility for building Angular components as functions.

## Install

```shell
yarn add ng-comp-fn
```

## Usage

```ts
import { Component } from 'ng-comp-fn';
import { effect, signal } from '@angular/core';

// Accepts all Angular @Component options
export default Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <button (click)="add()">{{count}}</button>
  `,
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
  });
});
```
