import { Observable, lastValueFrom } from "rxjs";
import { Action } from "../action";
import { DelUpdate, SetUpdate, Store, StoreKey, StoreUpdate, isSetUpdate } from "../store";
import { ActionHandlerFunc, ActionHandlerHelper } from "./actionCommon";

function removeProperty<T, K extends keyof T>(obj: T, prop: K): Omit<T, K> {
  const { [prop]: omitted, ...rest } = obj;
  return rest;
}

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
    del: key => Store.del(key),
  });
  const definedStore = store ?? Store.create();
  (setup ?? []).forEach(update => {
    if (isSetUpdate(update)) definedStore.set(update.key, update.value);
    else definedStore.del(update.key);
  });
  const actual: (Action | StoreUpdate)[] = [];
  const helper: ActionHandlerHelper = {
    has: key => definedStore.has(key),
    get: key => definedStore.get(key),
    get$: key => definedStore.get$(key),
    set: (key, value) => actual.push(Store.set(key, value)),
    del: key => actual.push(Store.del(key)),
    dispatch: action => actual.push(action),
    cancelIfChanged: () => {},
    isCancelled: () => false,
  };
  const result = payload ? handler(helper, payload) : (handler as ActionHandlerFunc<void>)(helper);
  if (result instanceof Observable) {
    await lastValueFrom(result).then(() => actual);
  } else if (result instanceof Promise) {
    await result.then(() => actual);
  }
  const removeTrace = (actionOrUpdate: Action | StoreUpdate) => removeProperty(actionOrUpdate, "trace");
  if (expected) expect(actual.map(removeTrace)).toStrictEqual(expected.map(removeTrace));
  if (asserts) asserts(actual);
};
