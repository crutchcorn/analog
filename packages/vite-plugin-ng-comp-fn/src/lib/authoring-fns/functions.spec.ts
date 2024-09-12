import { compileAngularFn } from './functions';

const COMPONENT_CONTENT = `
import {Component} from "ng-comp-fn";
import {effect, signal} from "@angular/core";

export default Component({
  selector: 'app-root',
  standalone: true,
  template: \`
    <button (click)="add()">{{count}}</button>
  \`
})(() => {
  const count = signal(0);

  function add() {
    // We shouldn't export \`one\` here
    const one = 123;
    count.set(count() + 1);
  }

  effect(() => {
    console.log(count());
  })
})
`;

describe('authoring functions', () => {
  it('should process component as an analog file', () => {
    const source = compileAngularFn('virtual.component.ts', COMPONENT_CONTENT);
    expect(source).toContain('Component');
    expect(source).toMatchSnapshot();
  });
});
