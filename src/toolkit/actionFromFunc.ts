import { Action, ActionCreator, ActionHandler } from "../action";
import { ReadonlyStore } from "../store";
import { ActionHandlerFunc, createActionHandler } from "./actionCommon";
import { Path, flatten } from "./util";

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
  (payload: P): Action<P, T> => ({ type, payload, trace: [] });

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

export const createSliceActions = <ActionHandlers extends Record<string, ActionTypeNode>>(actions: ActionHandlers) => {
  const actionCreators = createActionCreators(actions);
  const actionHandlerCreators = createActionHandlersCreator(actions);
  return { actions: actionCreators, actionHandlerCreators };
};
