import { Observable, Subject, combineLatest, pairwise, takeUntil, takeWhile } from "rxjs";
import { Action, ActionHandler } from "../action";
import { ReadonlyStore, Store, StoreKey, StoreKeyValue, StoreUpdate, Values } from "../store";

type CancelToken = {
  isCancelled: boolean;
};

const cancelIfChanged =
  (store: ReadonlyStore, action: Action, token: CancelToken, completed$: Observable<void>) =>
  <T extends StoreKey<any>[]>(
    keysToMonitor: T,
    shouldCancel: (previous: Values<T>, current: Values<T>) => boolean = () => true
  ) => {
    (combineLatest(keysToMonitor.map(key => store.get$(key))) as Observable<Values<T>>)
      .pipe(
        takeWhile(() => !token.isCancelled),
        takeUntil(completed$),
        pairwise()
      )
      .subscribe({
        next: ([prev, curr]) => {
          if (shouldCancel(prev, curr)) {
            console.log("canceling:", action.type, action.payload);
            token.isCancelled = true;
          }
        },
      });
  };

export type ActionHandlerHelper = {
  has: <T>(key: StoreKey<T>) => boolean;
  get: <T>(key: StoreKey<T>) => T;
  get$: <T>(key: StoreKey<T>) => Observable<T>;
  set: <T>(key: StoreKey<T>, value: T) => void;
  del: <T>(key: StoreKey<T>) => void;
  dispatch: <P, T extends string>(action: Action<P, T>) => void;
  cancelIfChanged: <T extends StoreKey<any>[]>(
    keysToMonitor: T,
    shouldCancel?: (previous: Values<T>, current: Values<T>) => boolean
  ) => void;
  isCancelled: () => boolean;
};

export type ActionHandlerFunc<P = void> = (
  helper: ActionHandlerHelper,
  payload: P
) => void | Promise<unknown> | Observable<unknown>;

export const createActionHandler =
  <P, T extends string>(store: ReadonlyStore, _: T, func: ActionHandlerFunc<P>): ActionHandler<P, T> =>
  (action: Action<P, T>) => {
    const token: CancelToken = { isCancelled: false };
    const completed$ = new Subject<void>();
    return new Observable<Action | StoreUpdate | StoreUpdate<[]>>(subscriber => {
      const helper: ActionHandlerHelper = {
        has: key => store.has(key),
        get: key => store.get(key),
        get$: key => store.get$(key),
        set: (key, value) => subscriber.next(Store.set(key, value, [action.type, ...action.trace])),
        del: key => subscriber.next(Store.del(key, [action.type, ...action.trace])),
        dispatch: act => subscriber.next({ ...act, trace: [action.type, ...action.trace] }),
        cancelIfChanged: cancelIfChanged(store, action, token, completed$),
        isCancelled: () => token.isCancelled,
      };
      const result = func(helper, action.payload);
      const dispose = () => {
        subscriber.complete();
        completed$.next();
        completed$.complete();
      };
      if (result) {
        if (result instanceof Observable) {
          result.subscribe({ complete: () => dispose() });
        } else if (result instanceof Promise) {
          result.then(() => dispose());
        }
      } else {
        dispose();
      }
    });
  };

export const setHandler: ActionHandlerFunc<StoreKeyValue<any>> = ({ set }, { key, value }) => set(key, value);

export const delHandler: ActionHandlerFunc<StoreKey<any>> = ({ del }, key) => del(key);
