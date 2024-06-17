import { Component as NgComponent } from '@angular/core';

export function Component(opts: NgComponent): (fn: () => void) => NgComponent;
