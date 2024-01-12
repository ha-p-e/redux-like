import { FC, createContext, memo, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Observable, combineLatest, debounceTime, identity, map, of } from 'rxjs'
import { Action } from './action'
import { Dispatcher } from './dispatcher'
import { ReadonlyStore, StoreKey, Values } from './store'

function useObservable<T>(observable: Observable<T>): T | undefined
function useObservable<T>(observable: Observable<T>, initialValue: T): T
function useObservable<T>(observable: Observable<T>, initialValue?: T): T | undefined {
  const [value, setState] = useState<T | undefined>(initialValue)

  useEffect(() => {
    const sub = observable.subscribe(setState)
    return () => sub.unsubscribe()
  }, [observable])

  return value
}

type ContextValue = {
  store: ReadonlyStore
  dispatch: Dispatcher
}

const Context = createContext<ContextValue>({} as ContextValue)

export const ContextProvider = ({ children, context }: { children: any; context: ContextValue }) => (
  <Context.Provider value={{ store: context.store, dispatch: context.dispatch }}>{children}</Context.Provider>
)

type PropCreatorHelper = {
  has: <T>(key: StoreKey<T>) => boolean
  get: <T>(key: StoreKey<T>) => T
  get$: <T>(key: StoreKey<T>) => Observable<T>
  dispatch: <P, T extends string>(action: Action<P, T>) => void
  onUnmount: (f: () => void) => void
  createProps$: <T extends StoreKey<any>[]>(
    ...keys: [...T]
  ) => <R>(f: (values: Values<T>) => R, debounce?: number) => Observable<R>
}

const createPropCreatorHelper = (
  store: ReadonlyStore,
  dispatch: Dispatcher,
  onUnmount: (f: () => void) => void
): PropCreatorHelper => ({
  has: key => store.has(key),
  get: key => store.get(key),
  get$: key => store.get$(key),
  dispatch: action => dispatch(action),
  onUnmount,
  createProps$:
    <T extends StoreKey<any>[]>(...keys: [...T]) =>
    <R,>(f: (values: Values<T>) => R, debounce?: number) =>
      (combineLatest(keys.map(key => store.get$(key))) as Observable<Values<T>>).pipe(
        debounce ? debounceTime(debounce) : identity,
        map(f)
      )
})

export type PropCreator<T extends {}, P extends {} = {}> = (helper: PropCreatorHelper, props: P) => Observable<T> | T

export const connect = <T extends {}, P extends {}>(Component: FC<T & P>, contextProps: PropCreator<T, P>) =>
  // memo to avoid re-rendering when parent component re-renders
  memo((props: P) => {
    const { store, dispatch } = useContext(Context)
    const unmountCallback = useRef<() => void>(() => {})
    const helper: PropCreatorHelper = useMemo(() => {
      const dispatchWithTrace = (action: Action) => dispatch({ ...action, trace: [Component.name, ...action.trace] })
      const onUnmount = (f: () => void) => (unmountCallback.current = f)
      return createPropCreatorHelper(store, dispatchWithTrace, onUnmount)
    }, [store, dispatch])
    const connectedProps = useMemo(() => contextProps(helper, props), [props, helper])
    const observableProps = useObservable(connectedProps instanceof Observable ? connectedProps : of(connectedProps))
    useEffect(() => () => unmountCallback.current(), [])
    return <>{observableProps && <Component {...{ ...observableProps, ...props }} />}</>
  })
