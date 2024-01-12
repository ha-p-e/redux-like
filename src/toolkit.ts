import { Observable, Subject, combineLatest, lastValueFrom, pairwise, takeUntil, takeWhile } from 'rxjs'
import { Action, ActionHandler } from './action'
import { Dispatcher } from './dispatcher'
import {
  DelUpdate,
  ReadonlyStore,
  SetUpdate,
  Store,
  StoreKey,
  StoreKeyValue,
  StoreUpdate,
  Values,
  isSetUpdate
} from './store'

// avoids leading "/" in path
type Path<Parent extends string, Node extends string> = Parent extends '' ? Node : `${Parent}/${Node}`

// Store Helpers

type InitialValue<T> = { initialValue: T }

type StoreKeyNode = InitialValue<any> | { [key: string]: StoreKeyNode } | ((node: string) => StoreKeyNode)

type StoreKeys<T extends StoreKeyNode, Parent extends string = ''> = {
  [K in keyof T & string]: T[K] extends InitialValue<infer InitVal>
    ? StoreKey<InitVal, Path<Parent, K>>
    : T[K] extends Record<string, StoreKeyNode>
    ? StoreKeys<T[K], Path<Parent, K>>
    : T[K] extends (node: string) => InitialValue<infer InitVal>
    ? <Node extends string>(node: Node) => StoreKey<InitVal, Path<Parent, `${K}/${Node}`>>
    : T[K] extends (node: string) => Record<string, StoreKeyNode>
    ? <Node extends string>(node: Node) => StoreKeys<ReturnType<T[K]>, Path<Parent, `${K}/${Node}`>>
    : never
}

const isInitialValue = <T>(value: any): value is InitialValue<T> =>
  typeof value === 'object' && value !== null && 'initialValue' in value

const createSliceKeys = <T extends Record<string, StoreKeyNode>>(storeKeys: T, parent: string = ''): StoreKeys<T> =>
  Object.fromEntries(
    Object.entries(storeKeys).map(([k, v]) => {
      // typeof v == (node: string) => InitialValue<any> | Record<string, NodeType>
      if (typeof v === 'function') {
        return [
          k,
          (node: string) => {
            const result = v(node)
            // typeof v == (node: string) => InitialValue<any>
            if (isInitialValue(result)) {
              return {
                key: parent === '' ? `${k}/${node}` : `${parent}/${k}/${node}`,
                initialValue: result.initialValue
              }
            }
            // typeof v == (node: string) => Record<string, NodeType>
            else if (typeof result === 'object' && result !== null) {
              return createSliceKeys(result, parent === '' ? `${k}/${node}` : `${parent}/${k}/${node}`)
            }
            // should not happen given the input type constraints
            throw new Error(`Invalid return type ${typeof result}`)
          }
        ]
      }
      // typeof v == InitialValue<any>
      else if (isInitialValue(v)) {
        const key = {
          key: parent === '' ? k : `${parent}/${k}`,
          initialValue: v.initialValue
        }
        return [k, key]
      }
      // typeof v == Record<string, NodeType>
      else if (typeof v === 'object' && v !== null) {
        return [k, createSliceKeys(v, parent === '' ? k : `${parent}/${k}`)]
      } else {
        // should not happen given the input type constraints
        throw new Error(`Invalid type ${typeof v}`)
      }
    })
  ) as StoreKeys<T>

export const init = <T>(value: T): InitialValue<T> => ({ initialValue: value })

// Action Helpers

type CancelToken = { isCancelled: boolean }

const cancelIfChanged =
  (store: ReadonlyStore, action: Action, token: CancelToken, completed$: Observable<void>) =>
  <T extends StoreKey<any>[]>(
    keysToMonitor: T,
    shouldCancel: (previous: Values<T>, current: Values<T>) => boolean = () => true
  ) => {
    ;(combineLatest(keysToMonitor.map(key => store.get$(key))) as Observable<Values<T>>)
      .pipe(
        takeWhile(() => !token.isCancelled),
        takeUntil(completed$),
        pairwise()
      )
      .subscribe({
        next: ([prev, curr]) => {
          if (shouldCancel(prev, curr)) {
            console.log('canceling:', action.type, action.payload)
            token.isCancelled = true
          }
        }
      })
  }

type ActionHandlerHelper = {
  has: <T>(key: StoreKey<T>) => boolean
  get: <T>(key: StoreKey<T>) => T
  get$: <T>(key: StoreKey<T>) => Observable<T>
  set: <T>(key: StoreKey<T>, value: T) => void
  del: <T>(key: StoreKey<T>) => void
  dispatch: <P, T extends string>(action: Action<P, T>) => void
  cancelIfChanged: <T extends StoreKey<any>[]>(
    keysToMonitor: [...T],
    shouldCancel?: (previous: Values<T>, current: Values<T>) => boolean
  ) => void
  isCancelled: () => boolean
}

export type ActionHandlerFunc<P = void> = (
  helper: ActionHandlerHelper,
  payload: P
) => void | Promise<unknown> | Observable<unknown>

const createActionHandler =
  <P, T extends string>(store: ReadonlyStore, _: T, func: ActionHandlerFunc<P>): ActionHandler<P, T> =>
  (action: Action<P, T>) => {
    const token: CancelToken = { isCancelled: false }
    const completed$ = new Subject<void>()
    return new Observable<Action | StoreUpdate | StoreUpdate<[]>>(subscriber => {
      const helper: ActionHandlerHelper = {
        has: key => store.has(key),
        get: key => store.get(key),
        get$: key => store.get$(key),
        set: (key, value) => subscriber.next(Store.set(key, value, [action.type, ...action.trace])),
        del: key => subscriber.next(Store.del(key, [action.type, ...action.trace])),
        dispatch: act => subscriber.next({ ...act, trace: [action.type, ...action.trace] }),
        cancelIfChanged: cancelIfChanged(store, action, token, completed$),
        isCancelled: () => token.isCancelled
      }
      const result = func(helper, action.payload)
      const dispose = () => {
        subscriber.complete()
        completed$.next()
        completed$.complete()
      }
      if (result) {
        if (result instanceof Observable) {
          result.subscribe({ complete: () => dispose() })
        } else if (result instanceof Promise) {
          result.then(() => dispose())
        }
      } else {
        dispose()
      }
    })
  }

type ActionType<P, T extends string> = { type: T; _: P }

type PayloadType<T> = { _payloadTypeTag: '_payloadTypeTag' }

const isPayloadType = <T>(payload: any): payload is PayloadType<T> => payload._payloadTypeTag === '_payloadTypeTag'

export const payload = <T>(): PayloadType<T> => ({ _payloadTypeTag: '_payloadTypeTag' } as PayloadType<T>)

type ActionTypeNode = PayloadType<any> | { [key: string]: ActionTypeNode }

type ActionCreators<T extends ActionTypeNode, Parent extends string = ''> = {
  [K in keyof T & string]: T[K] extends PayloadType<infer P>
    ? (payload: P) => Action<P, Path<Parent, K>>
    : T[K] extends Record<string, ActionTypeNode>
    ? ActionCreators<T[K], Path<Parent, K>>
    : never
}

type ActionTypes<T extends ActionTypeNode, Parent extends string = ''> = {
  [K in keyof T & string]: T[K] extends PayloadType<infer P>
    ? ActionType<P, Path<Parent, K>>
    : T[K] extends Record<string, ActionTypeNode>
    ? ActionTypes<T[K], Path<Parent, K>>
    : never
}

const createActionCreator =
  <P, T extends string>(type: T, _: PayloadType<P>): ((payload: P) => Action<P, T>) =>
  (payload: P): Action<P, T> => ({ type, payload, trace: [] })

const createActionCreators = <T extends Record<string, ActionTypeNode>>(
  types: T,
  parent: string = ''
): ActionCreators<T> =>
  Object.fromEntries(
    Object.entries(types).map(([k, v]) =>
      isPayloadType(v)
        ? [k, createActionCreator(parent === '' ? k : `${parent}/${k}`, v)]
        : [k, createActionCreators(v as Record<string, ActionTypeNode>, parent === '' ? k : `${parent}/${k}`)]
    )
  )

const createActionTypes = <T extends Record<string, ActionTypeNode>>(types: T, parent: string = ''): ActionTypes<T> =>
  Object.fromEntries(
    Object.entries(types).map(([k, v]) =>
      isPayloadType(v)
        ? [k, { type: parent === '' ? k : `${parent}/${k}` }]
        : [k, createActionTypes(v as Record<string, ActionTypeNode>, parent === '' ? k : `${parent}/${k}`)]
    )
  )

const createSliceActions = <T extends Record<string, ActionTypeNode>>(types: T) => {
  const actions = createActionCreators(types)
  const actionTypes = createActionTypes(types)
  return { actions, actionTypes }
}

export const handler = <P, T extends string>(
  actionType: ActionType<P, T>,
  handlerFunc: ActionHandlerFunc<P>
): [ActionType<P, T>, ActionHandlerFunc<P>] => [actionType, handlerFunc]

export const createActionHandlerCreators =
  (
    ...handlers: [ActionType<any, string>, ActionHandlerFunc<any>][]
  ): ((store: ReadonlyStore) => Record<string, ActionHandler<string, any>>) =>
  (store: ReadonlyStore) =>
    Object.fromEntries(
      handlers.map(([actionType, handler]) => [actionType.type, createActionHandler(store, actionType.type, handler)])
    )

// Generic Handlers

export const setHandler: ActionHandlerFunc<StoreKeyValue<any>> = ({ set }, { key, value }) => set(key, value)

export const delHandler: ActionHandlerFunc<StoreKey<any>> = ({ del }, key) => del(key)

// Slice Helpers

export const initSlice =
  (...actionHandlerCreators: ((store: ReadonlyStore) => Record<string, ActionHandler<any>>)[]) =>
  (store: Store = Store.create()) => {
    const handlers = actionHandlerCreators.reduce((acc, c) => ({ ...acc, ...c(store) }), {})
    const [dispatch, updates$] = Dispatcher.create(store)(handlers)
    return { store, dispatch, updates$ }
  }

export const createSlice = <
  StoreKeys extends Record<string, StoreKeyNode>,
  ActionHandlers extends Record<string, ActionTypeNode>
>(slice: {
  keys: StoreKeys
  actions: ActionHandlers
}) => {
  const keys = createSliceKeys(slice.keys)
  const { actions, actionTypes } = createSliceActions(slice.actions)
  return { keys, actions, actionTypes }
}

// Test Helpers

function removeProperty<T, K extends keyof T>(obj: T, prop: K): Omit<T, K> {
  const { [prop]: omitted, ...rest } = obj
  return rest
}

type ActionHandlerTestHelper = {
  set: <T>(key: StoreKey<T>, value: T) => SetUpdate<T>
  del: <T>(key: StoreKey<T>) => DelUpdate<T>
  dispatch: (action: Action) => Action
}

export const testActionHandler = async <P>(
  f: (helper: ActionHandlerTestHelper) => {
    store?: Store
    setup?: StoreUpdate[]
    handler: ActionHandlerFunc<P>
    payload?: P
    expected?: (Action | StoreUpdate)[]
    asserts?: (actual: (Action | StoreUpdate)[]) => void
  }
): Promise<void> => {
  const { store, setup, handler, payload, expected, asserts } = f({
    set: (key, value) => Store.set(key, value),
    del: key => Store.del(key),
    dispatch: action => action
  })
  const definedStore = store ?? Store.create()
  ;(setup ?? []).forEach(update => {
    if (isSetUpdate(update)) definedStore.set(update.key, update.value)
    else definedStore.del(update.key)
  })
  const actual: (Action | StoreUpdate)[] = []
  const helper: ActionHandlerHelper = {
    has: key => definedStore.has(key),
    get: key => definedStore.get(key),
    get$: key => definedStore.get$(key),
    set: (key, value) => actual.push(Store.set(key, value)),
    del: key => actual.push(Store.del(key)),
    dispatch: action => actual.push(action),
    cancelIfChanged: () => {},
    isCancelled: () => false
  }
  const result = payload ? handler(helper, payload) : (handler as ActionHandlerFunc<void>)(helper)
  if (result instanceof Observable) {
    await lastValueFrom(result).then(() => actual)
  } else if (result instanceof Promise) {
    await result.then(() => actual)
  }
  const removeTrace = (actionOrUpdate: Action | StoreUpdate) => removeProperty(actionOrUpdate, 'trace')
  if (expected) expect(actual.map(removeTrace)).toStrictEqual(expected.map(removeTrace))
  if (asserts) asserts(actual)
}
