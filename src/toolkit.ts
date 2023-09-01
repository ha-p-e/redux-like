import { Observable, lastValueFrom } from "rxjs";
import { Action, ActionCreator, ActionHandler } from "./action";
import { Dispatcher } from "./dispatcher";
import { DelUpdate, ReadonlyStore, SetUpdate, Store, StoreKey, StoreUpdate, isSetUpdate } from "./store";

// avoids leading "/" in path
type Path<Parent extends string, Node extends string> = Parent extends "" ? Node : `${Parent}/${Node}`;

// Store Helpers

type InitialValue<T> = { initialValue: T };

export type StoreKeyNode = InitialValue<any> | { [key: string]: StoreKeyNode } | ((node: string) => StoreKeyNode);

type StoreKeys<T extends StoreKeyNode, Parent extends string = ""> = {
  [K in keyof T & string]: T[K] extends InitialValue<infer InitVal>
    ? StoreKey<InitVal, Path<Parent, K>>
    : T[K] extends Record<string, StoreKeyNode>
    ? StoreKeys<T[K], Path<Parent, K>>
    : T[K] extends (node: string) => InitialValue<infer InitVal>
    ? // todo how to keep name of function param instead of changing to node
      // note cannot use ...args: Parameters<T[K]> as it will lose the type of Node in the path
      <Node extends string>(node: Node) => StoreKey<InitVal, Path<Parent, `${K}/${Node}`>>
    : T[K] extends (node: string) => Record<string, StoreKeyNode>
    ? <Node extends string>(node: Node) => StoreKeys<ReturnType<T[K]>, Path<Parent, `${K}/${Node}`>>
    : never;
};

const isInitialValue = <T>(value: any): value is InitialValue<T> =>
  typeof value === "object" && value !== null && "initialValue" in value;

export const createStoreKeys = <T extends Record<string, StoreKeyNode>>(
  storeKeys: T,
  parent: string = ""
): StoreKeys<T> =>
  Object.fromEntries(
    Object.entries(storeKeys).map(([k, v]) => {
      // typeof v == (node: string) => InitialValue<any> | Record<string, NodeType>
      if (typeof v === "function") {
        return [
          k,
          (node: string) => {
            const result = v(node);
            // typeof v == (node: string) => InitialValue<any>
            if (isInitialValue(result)) {
              return {
                key: parent === "" ? `${k}/${node}` : `${parent}/${k}/${node}`,
                initialValue: result.initialValue,
              };
            }
            // typeof v == (node: string) => Record<string, NodeType>
            else if (typeof result === "object" && result !== null) {
              return createStoreKeys(result, parent === "" ? `${k}/${node}` : `${parent}/${k}/${node}`);
            }
            // should not happen given the input type constraints
            throw new Error(`Invalid return type ${typeof result}`);
          },
        ];
      }
      // typeof v == InitialValue<any>
      else if (isInitialValue(v)) {
        const key = { key: parent === "" ? k : `${parent}/${k}`, initialValue: v.initialValue };
        return [k, key];
      }
      // typeof v == Record<string, NodeType>
      else if (typeof v === "object" && v !== null) {
        return [k, createStoreKeys(v, parent === "" ? k : `${parent}/${k}`)];
      } else {
        // should not happen given the input type constraints
        throw new Error(`Invalid type ${typeof v}`);
      }
    })
  ) as StoreKeys<T>;

export const init = <T>(value: T): InitialValue<T> => ({ initialValue: value });

// Actions Helpers

type ActionHandlerHelper = {
  has: <T>(key: StoreKey<T>) => boolean;
  get: <T>(key: StoreKey<T>) => T;
  get$: <T>(key: StoreKey<T>) => Observable<T>;
  set: <T>(key: StoreKey<T>, value: T) => void;
  del: <T>(key: StoreKey<T>) => void;
  dispatch: <P, T extends string>(action: Action<P, T>) => void;
};

export type ActionHandlerFunc<P = void> = (
  payload: P
) => (helper: ActionHandlerHelper) => void | Promise<unknown> | Observable<unknown>;

export type ActionTypeNode = { [key: string]: ActionTypeNode } | ActionHandlerFunc<any>;

type ActionCreators<T extends ActionTypeNode, Parent extends string = ""> = {
  [K in keyof T & string]: T[K] extends Record<string, ActionTypeNode>
    ? ActionCreators<T[K], Path<Parent, K>>
    : T[K] extends ActionHandlerFunc<infer P>
    ? ActionCreator<P, Path<Parent, K>>
    : never;
};

type ActionHandlers<T extends ActionTypeNode, Parent extends string = ""> = {
  [K in keyof T & string]: T[K] extends Record<string, ActionTypeNode>
    ? ActionHandlers<T[K], Path<Parent, K>>
    : T[K] extends ActionHandlerFunc<infer P>
    ? ActionHandler<P, Path<Parent, K>>
    : never;
};

const createActionCreator =
  <P, T extends string>(type: T, _: ActionHandlerFunc<P>): ((payload: P) => Action<P, T>) =>
  (payload: P): Action<P, T> => ({ type, payload });

export const createActionCreators = <T extends Record<string, ActionTypeNode>>(
  handlers: T,
  parent: string = ""
): ActionCreators<T> =>
  Object.fromEntries(
    Object.entries(handlers).map(([k, v]) => {
      if (typeof v === "object" && v !== null) {
        return [k, createActionCreators(v, parent === "" ? k : `${parent}/${k}`)];
      } else {
        return [k, createActionCreator(parent === "" ? k : `${parent}/${k}`, v)];
      }
    })
  );

const createActionHandler =
  <P, T extends string>(store: ReadonlyStore, _: T, func: ActionHandlerFunc<P>): ActionHandler<P, T> =>
  (action: Action<P, T>) =>
    new Observable<Action | StoreUpdate | StoreUpdate<[]>>((subscriber) => {
      const helper: ActionHandlerHelper = {
        has: (key) => store.has(key),
        get: (key) => store.get(key),
        get$: (key) => store.get$(key),
        set: (key, value) => subscriber.next(Store.set(key, value)),
        del: (key) => subscriber.next(Store.del(key)),
        dispatch: (action) => subscriber.next(action),
      };
      func(action.payload)(helper);
    });

export const createActionHandlers = <T extends Record<string, ActionTypeNode>>(
  store: ReadonlyStore,
  handlers: T,
  parent: string = ""
): ActionHandlers<T> =>
  Object.fromEntries(
    Object.entries(handlers).map(([k, v]) => {
      if (typeof v === "object" && v !== null) {
        return [k, createActionHandlers(store, v, `${parent}/${k}`)];
      } else {
        return [k, createActionHandler(store, `${parent}/${k}`, v)];
      }
    })
  );

export const createActionHandlersCreator =
  <T extends Record<string, ActionTypeNode>>(handlers: T, parent: string = "") =>
  (store: ReadonlyStore): Record<string, ActionHandler<any>> =>
    flatten(
      Object.fromEntries(
        Object.entries(handlers).map(([k, v]) => {
          if (typeof v === "object" && v !== null) {
            return [k, createActionHandlers(store, v, `${parent}/${k}`)];
          } else {
            return [k, createActionHandler(store, `${parent}/${k}`, v)];
          }
        })
      )
    ) as Record<string, ActionHandler<any>>;

// Slice Helpers

// from https://stackoverflow.com/a/66620803
type Flatten<T extends object> = object extends T
  ? object
  : {
      [K in keyof T]-?: (
        x: NonNullable<T[K]> extends infer V
          ? V extends object
            ? V extends readonly any[]
              ? Pick<T, K>
              : Flatten<V> extends infer FV
              ? {
                  [P in keyof FV as `${Extract<K, string | number>}/${Extract<P, string | number>}`]: FV[P];
                }
              : never
            : Pick<T, K>
          : never
      ) => void;
    } extends Record<keyof T, (y: infer O) => void>
  ? O extends infer U
    ? { [K in keyof O]: O[K] }
    : never
  : never;

const flatten = <T extends object>(obj: T): Flatten<T> => {
  const result: any = {};

  const transform = (wrapper: any, p?: string) => {
    switch (typeof wrapper) {
      case "object":
        p = p ? p + "/" : "";
        for (const item in wrapper) {
          transform(wrapper[item], p + item);
        }
        break;
      default:
        if (p) {
          result[p] = wrapper;
        }
        break;
    }
  };
  transform(obj);

  return result;
};

export const initSlice =
  (...actionHandlerCreators: ((store: Store) => Record<string, ActionHandler<any>>)[]) =>
  (store: Store = Store.create()) => {
    const handlers = actionHandlerCreators.reduce((acc, c) => ({ ...acc, ...c(store) }), {});
    const [dispatch, updates$] = Dispatcher.create(store)(handlers);
    return { store, dispatch, updates$ };
  };

export const createSlice = <
  StoreKeys extends Record<string, StoreKeyNode>,
  ActionHandlers extends Record<string, ActionTypeNode>
>(inputs: {
  keys: StoreKeys;
  actions: ActionHandlers;
}) => {
  const keys = createStoreKeys(inputs.keys);
  const actions = createActionCreators(inputs.actions);
  const actionHandlerCreators = createActionHandlersCreator(inputs.actions);
  const initializeSlice = initSlice(actionHandlerCreators);
  return { keys, actions, actionHandlerCreators, initSlice: initializeSlice };
};

// Test Helpers

type ActionHandlerTestHelper = {
  set: <T>(key: StoreKey<T>, value: T) => SetUpdate<T>;
  del: <T>(key: StoreKey<T>) => DelUpdate<T>;
};

export const testActionHandler = async <P>(
  f: (helper: ActionHandlerTestHelper) => {
    store?: Store;
    setup?: StoreUpdate[];
    handler: ActionHandlerFunc<P>;
    payload?: P;
    expected?: (Action | StoreUpdate)[];
    asserts?: (actual: (Action | StoreUpdate)[]) => void;
  }
): Promise<void> => {
  const { store, setup, handler, payload, expected, asserts } = f({
    set: (key, value) => Store.set(key, value),
    del: (key) => Store.del(key),
  });
  const definedStore = store ?? Store.create();
  (setup ?? []).forEach((update) => {
    if (isSetUpdate(update)) definedStore.set(update.key, update.value);
    else definedStore.del(update.key);
  });
  const actual: (Action | StoreUpdate)[] = [];
  const helper: ActionHandlerHelper = {
    has: (key) => definedStore.has(key),
    get: (key) => definedStore.get(key),
    get$: (key) => definedStore.get$(key),
    set: (key, value) => actual.push(Store.set(key, value)),
    del: (key) => actual.push(Store.del(key)),
    dispatch: (action) => actual.push(action),
  };
  const result = payload ? handler(payload)(helper) : (handler as ActionHandlerFunc<void>)()(helper);
  if (result instanceof Observable) {
    await lastValueFrom(result).then(() => actual);
  } else if (result instanceof Promise) {
    await result.then(() => actual);
  }
  if (expected) expect(actual).toStrictEqual(expected);
  if (asserts) asserts(actual);
};
