import { EMPTY, Observable, Subject, from, map, of } from "rxjs";
import { Store, StoreUpdate, isSetUpdate } from "./store";
import { Action, ActionHandler, ActionType } from "./action";

export type Dispatcher<T = any> = (action: Action<T>) => void;

export module Dispatcher {
  const toObservableUpdate = (
    update:
      | StoreUpdate<any>
      | StoreUpdate<any>[]
      | Promise<StoreUpdate<any> | StoreUpdate<any>[]>
      | Observable<StoreUpdate<any> | StoreUpdate<any>[]>
      | undefined
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
    if (update) {
      return of([update]);
    }
    return EMPTY;
  };

  export const create =
    <T = any>(store: Store) =>
    (
      handlers: [ActionType<T>, ActionHandler<T>][]
    ): [
      (action: Action<T>) => void,
      Observable<Action<T> | StoreUpdate<any>[] | Error>
    ] => {
      const updates$ = new Subject<Action<T> | StoreUpdate<any>[] | Error>();
      const dispatcher: Dispatcher<T> = (action: Action<T>) => {
        updates$.next(action);
        const actionHandlersMap = new Map<string, ActionHandler<T>>(
          handlers.map(([k, v]) => [k.type, v])
        );
        const handler = actionHandlersMap.get(action.type.type);
        if (handler) {
          try {
            const result = handler(action);
            toObservableUpdate(result).subscribe({
              next: (updates) => {
                updates.forEach((update) => {
                  if (isSetUpdate(update)) store.set(update.key, update.value);
                  else store.del(update.key);
                });
                updates$.next(updates);
              },
              error: (e: Error) => updates$.next(e),
              // do not complete subject
            });
          } catch (e) {
            e instanceof Error
              ? updates$.next(e)
              : updates$.next(new Error(String(e)));
          }
        } else {
          updates$.next(
            new Error(
              `Action handler for '${JSON.stringify(action)}' not found`
            )
          );
        }
      };
      return [dispatcher, updates$.asObservable()];
    };
}
