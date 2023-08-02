import { EMPTY, Observable, Subject, from, map, of } from "rxjs";
import { Store, StoreUpdate, isSetUpdate } from "./store";
import { Action, ActionHandler, isAction } from "./action";

export type Dispatcher<T = any> = (action: Action<T>) => void;

const toObservableUpdate = (
  update:
    | Action
    | StoreUpdate
    | StoreUpdate[]
    | Promise<Action | StoreUpdate | StoreUpdate[]>
    | Observable<Action | StoreUpdate | StoreUpdate[]>
    | void
): Observable<Action | StoreUpdate[]> => {
  if (update instanceof Observable) {
    return update.pipe(map((x) => (Array.isArray(x) || isAction(x) ? x : [x])));
  }
  if (update instanceof Promise) {
    return from(update.then((x) => (Array.isArray(x) || isAction(x) ? x : [x])));
  }
  if (Array.isArray(update)) {
    return of(update);
  }
  if (isAction(update)) {
    return of(update);
  }
  if (update) {
    return of([update]);
  }
  return EMPTY;
};

const create =
  <T = any>(store: Store) =>
  (
    handlers: Record<string, ActionHandler<T>>
  ): [(action: Action<T>) => void, Observable<Action<T> | StoreUpdate[] | Error>] => {
    const updates$ = new Subject<Action<T> | StoreUpdate[] | Error>();
    const dispatcher: Dispatcher<T> = (action: Action<T>) => {
      updates$.next(action);
      const handler = handlers[action.type];
      if (handler) {
        try {
          const result = handler(action);
          toObservableUpdate(result).subscribe({
            next: (updates) => {
              if (isAction(updates)) {
                dispatcher(updates);
              } else {
                updates.forEach((update) => {
                  if (isSetUpdate(update)) store.set(update.key, update.value);
                  else store.del(update.key);
                });
              }
              updates$.next(updates);
            },
            error: (e: Error) => updates$.next(e),
            // do not complete subject
          });
        } catch (e) {
          e instanceof Error ? updates$.next(e) : updates$.next(new Error(String(e)));
        }
      } else {
        updates$.next(new Error(`Action handler for '${JSON.stringify(action)}' not found`));
      }
    };
    return [dispatcher, updates$.asObservable()];
  };

export const Dispatcher = { create };
