/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {isPromise} from '../src/util/lang';

import {Inject, Injectable, InjectionToken, Optional, inject} from './di';
import {defineInjectable} from './di/defs';



/**
 * A function that will be executed when an application is initialized.
 * @experimental
 */
export const APP_INITIALIZER = new InjectionToken<Array<() => void>>('Application Initializer');

/**
 * A class that reflects the state of running {@link APP_INITIALIZER}s.
 *
 * @experimental
 */
export class ApplicationInitStatus {
  // `ngInjectableDef` is required in core-level code because it sits behind
  // the injector and any code the loads it inside may run into a dependency
  // loop (because Injectable is also in core. Do not use the code below
  // (use @Injectable({ providedIn, factory }))  instead...
  /**
   * @internal
   * @nocollapse
   */
  static ngInjectableDef = defineInjectable({
    providedIn: 'root',
    factory: function ApplicationInitStatus_Factory() {
      return new ApplicationInitStatus(inject(APP_INITIALIZER));
    }
  });

  private resolve: Function;
  private reject: Function;
  private initialized = false;
  public readonly donePromise: Promise<any>;
  public readonly done = false;

  constructor(@Inject(APP_INITIALIZER) @Optional() private appInits: (() => any)[]) {
    this.donePromise = new Promise((res, rej) => {
      this.resolve = res;
      this.reject = rej;
    });
  }

  /** @internal */
  runInitializers() {
    if (this.initialized) {
      return;
    }

    const asyncInitPromises: Promise<any>[] = [];

    const complete = () => {
      (this as{done: boolean}).done = true;
      this.resolve();
    };

    if (this.appInits) {
      for (let i = 0; i < this.appInits.length; i++) {
        const initResult = this.appInits[i]();
        if (isPromise(initResult)) {
          asyncInitPromises.push(initResult);
        }
      }
    }

    Promise.all(asyncInitPromises).then(() => { complete(); }).catch(e => { this.reject(e); });

    if (asyncInitPromises.length === 0) {
      complete();
    }
    this.initialized = true;
  }
}
