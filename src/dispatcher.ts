import { Observable, Subject, from, map, of } from "rxjs";
import { Store, StoreUpdate, isStoreUpdateSet } from "./store";
import { Action, ActionHandler, ActionType } from "./action";

export type Dispatcher<T = any> = (action: Action<T>) => void;

export module Dispatcher {
  const toObservableUpdate = (
    update:
      | StoreUpdate<any>
      | StoreUpdate<any>[]
      | Promise<StoreUpdate<any> | StoreUpdate<any>[]>
      | Observable<StoreUpdate<any> | StoreUpdate<any>[]>
  ): Observable<StoreUpdate<any>[]> => {
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

  // todo improve error handling
  export const create =
    <T = any>(store: Store) =>
    (
      handlers: [ActionType<T>, ActionHandler<T>][]
    ): [
      (action: Action<T>) => void,
      Observable<Action<T>>,
      Observable<StoreUpdate<any>[]>
    ] => {
      const actionsDispatched$ = new Subject<Action<T>>();
      const storeUpdates$ = new Subject<StoreUpdate<any>[]>();
      const dispatcher: Dispatcher<T> = (action: Action<T>) => {
        actionsDispatched$.next(action);
        const actionHandlersMap = new Map<ActionType<T>, ActionHandler<T>>(
          handlers
        );
        const handler = actionHandlersMap.get(action.type);
        if (handler) {
          const result = handler(action);
          toObservableUpdate(result).subscribe({
            next: (updates) => {
              updates.forEach((update) => {
                if (isStoreUpdateSet(update))
                  store.set(update.key, update.value);
                else store.del(update.key);
              });
              storeUpdates$.next(updates);
            },
            error: (e) => storeUpdates$.error(e),
            // do not complete subject
          });
        } else {
          storeUpdates$.error(`Action handler for '${action}' not found`);
        }
      };
      return [
        dispatcher,
        actionsDispatched$.asObservable(),
        storeUpdates$.asObservable(),
      ];
    };
}
