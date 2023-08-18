import { FC, createContext, useContext, useEffect, useMemo, useState } from "react";
import { Observable, combineLatest, debounceTime, identity, map, of } from "rxjs";
import { ReadonlyStore, StoreKey } from "./store";
import { Dispatcher } from "./dispatcher";
import { Action } from "./action";

function useObservable<T>(observable: Observable<T>): T | undefined;
function useObservable<T>(observable: Observable<T>, initialValue: T): T;
function useObservable<T>(observable: Observable<T>, initialValue?: T): T | undefined {
  const [value, setState] = useState<T | undefined>(initialValue);

  useEffect(() => {
    const sub = observable.subscribe(setState);
    return () => sub.unsubscribe();
  }, [observable]);

  return value;
}

type ContextValue = {
  store: ReadonlyStore;
  dispatch: Dispatcher;
};

const Context = createContext<ContextValue>({} as ContextValue);

export const ContextProvider = ({ children, context }: { children: any; context: ContextValue }) => (
  <Context.Provider value={{ store: context.store, dispatch: context.dispatch }}>{children}</Context.Provider>
);

type Values<T> = {
  [K in keyof T]: T[K] extends StoreKey<infer V, any> ? V : never;
};

type PropCreatorHelper = {
  has: <T>(key: StoreKey<T>) => boolean;
  get: <T>(key: StoreKey<T>) => T;
  get$: <T>(key: StoreKey<T>) => Observable<T>;
  dispatch: <P, T extends string>(action: Action<P, T>) => void;
  createProps$: <T extends StoreKey<any>[]>(
    ...keys: [...T]
  ) => <R>(f: (values: Values<T>) => R, debounce?: number) => Observable<R>;
};

const createPropCreatorHelper = (store: ReadonlyStore, dispatch: Dispatcher): PropCreatorHelper => ({
  has: (key) => store.has(key),
  get: (key) => store.get(key),
  get$: (key) => store.get$(key),
  dispatch: (action) => dispatch(action),
  createProps$:
    <T extends StoreKey<any>[]>(...keys: [...T]) =>
    <R,>(f: (values: Values<T>) => R, debounce?: number) =>
      (combineLatest(keys.map((key) => store.get$(key))) as Observable<Values<T>>).pipe(
        debounce ? debounceTime(debounce) : identity,
        map(f)
      ),
});

export type PropCreator<T extends {}, P extends {} = {}> = (
  props: P
) => (helper: PropCreatorHelper) => Observable<T> | T;

export const connect =
  <T extends {}, P extends {}>(Component: FC<T & P>, contextProps: PropCreator<T, P>): FC<P> =>
  (props: P) => {
    const { store, dispatch } = useContext(Context);
    const helper: PropCreatorHelper = useMemo(() => createPropCreatorHelper(store, dispatch), [store, dispatch]);
    const connectedProps = useMemo(() => contextProps(props)(helper), [props, helper]);
    const observableProps = useObservable(connectedProps instanceof Observable ? connectedProps : of(connectedProps));
    return <>{observableProps && <Component {...{ ...observableProps, ...props }} />}</>;
  };
