import { Observable, Subject, from, map, of } from "rxjs";
import { Store, StoreKeyValue } from "./store";
import { Action, ActionHandler, ActionType } from "./action";

export type Dispatcher<T = any> = (action: Action<T>) => void;

export module Dispatcher {
  const toObservableUpdate = (
    update:
      | StoreKeyValue<any>
      | StoreKeyValue<any>[]
      | Promise<StoreKeyValue<any> | StoreKeyValue<any>[]>
      | Observable<StoreKeyValue<any> | StoreKeyValue<any>[]>
  ): Observable<StoreKeyValue<any>[]> => {
    if (update instanceof Observable) {
      return update.pipe(map((x) => (Array.isArray(x) ? x : [x])));
    }
    if (update instanceof Promise) {
      return from(update.then((x) => (Array.isArray(x) ? x : [x])));
    }
    if (Array.isArray(update)) {
      return of(update);
    }
    return of([update]);
  };

  export const create =
    <T = any>(store: Store) =>
    (
      handlers: [ActionType<T>, ActionHandler<T>][]
    ): [(action: Action<T>) => void, Observable<StoreKeyValue<any>[]>] => {
      const subject$ = new Subject<StoreKeyValue<any>[]>();
      const dispatcher: Dispatcher<T> = (action: Action<T>) => {
        const actionHandlersMap = new Map<ActionType<T>, ActionHandler<T>>(
          handlers
        );
        const handler = actionHandlersMap.get(action.type);
        if (handler) {
          const result = handler(action);
          toObservableUpdate(result).subscribe({
            next: (updates) => {
              updates.forEach((update) => store.set(update.key, update.value));
              subject$.next(updates);
            },
            error: (e) => subject$.error(e),
            // do not complete subject
          });
        } else {
          subject$.error(`Action handler for '${action}' not found`);
        }
      };
      return [dispatcher, subject$.asObservable()];
    };
}
