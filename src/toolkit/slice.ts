import { ActionHandler } from "../action";
import { Dispatcher } from "../dispatcher";
import { ReadonlyStore, Store } from "../store";
import { ActionTypeNode, createSliceActions } from "./actionFromFunc";
import { StoreKeyNode, createSliceKeys } from "./store";

export const initSlice =
  (...actionHandlerCreators: ((store: ReadonlyStore) => Record<string, ActionHandler<any>>)[]) =>
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
  const keys = createSliceKeys(inputs.keys);
  const { actions, actionHandlerCreators } = createSliceActions(inputs.actions);
  const initializeSlice = initSlice(actionHandlerCreators);
  return { keys, actions, actionHandlerCreators, initSlice: initializeSlice };
};
