import { Action, ActionHandler } from "../action";
import { ReadonlyStore } from "../store";
import { ActionHandlerFunc, createActionHandler } from "./actionCommon";
import { Path } from "./util";

type ActionType<P, T extends string> = { type: T };

type PayloadType<T> = { _payloadTypeTag: "_payloadTypeTag" };

const isPayloadType = <T>(payload: any): payload is PayloadType<T> => payload._payloadTypeTag === "_payloadTypeTag";

export const payload = <T>(): PayloadType<T> => ({ _payloadTypeTag: "_payloadTypeTag" } as PayloadType<T>);

type ActionTypeNode = PayloadType<any> | { [key: string]: ActionTypeNode };

type ActionCreators<T extends ActionTypeNode, Parent extends string = ""> = {
  [K in keyof T & string]: T[K] extends PayloadType<infer P>
    ? (payload: P) => Action<P, Path<Parent, K>>
    : T[K] extends Record<string, ActionTypeNode>
    ? ActionCreators<T[K], Path<Parent, K>>
    : never;
};

type ActionTypes<T extends ActionTypeNode, Parent extends string = ""> = {
  [K in keyof T & string]: T[K] extends PayloadType<infer P>
    ? ActionType<P, Path<Parent, K>>
    : T[K] extends Record<string, ActionTypeNode>
    ? ActionTypes<T[K], Path<Parent, K>>
    : never;
};

const createActionCreator =
  <P, T extends string>(type: T, _: PayloadType<P>): ((payload: P) => Action<P, T>) =>
  (payload: P): Action<P, T> => ({ type, payload, trace: [] });

export const createActionCreators = <T extends Record<string, ActionTypeNode>>(
  types: T,
  parent: string = ""
): ActionCreators<T> =>
  Object.fromEntries(
    Object.entries(types).map(([k, v]) => {
      if (isPayloadType(v)) {
        return [k, createActionCreator(parent === "" ? k : `${parent}/${k}`, v)];
      }
      return [k, createActionCreators(v as Record<string, ActionTypeNode>, parent === "" ? k : `${parent}/${k}`)];
    })
  );

export const createActionTypes = <T extends Record<string, ActionTypeNode>>(
  types: T,
  parent: string = ""
): ActionTypes<T> =>
  Object.fromEntries(
    Object.entries(types).map(([k, v]) => {
      if (isPayloadType(v)) {
        return [k, parent === "" ? k : `${parent}/${k}`, v];
      }
      return [k, createActionTypes(v as Record<string, ActionTypeNode>, parent === "" ? k : `${parent}/${k}`)];
    })
  );

export const createSliceActions = <T extends Record<string, ActionTypeNode>>(types: T) => {
  const actions = createActionCreators(types);
  const actionTypes = createActionTypes(types);
  return { actions, actionTypes };
};

export const handler = <P, T extends string>(
  actionType: ActionType<P, T>,
  handlerFunc: ActionHandlerFunc<P>
): [ActionType<P, T>, ActionHandlerFunc<P>] => [actionType, handlerFunc];

export const createActionHandlerCreators =
  (
    ...handlers: [ActionType<any, string>, ActionHandlerFunc<any>][]
  ): ((store: ReadonlyStore) => Record<string, ActionHandler<string, any>>) =>
  (store: ReadonlyStore) => {
    return Object.fromEntries(
      handlers.map(([actionType, handler]) => [actionType, createActionHandler(store, actionType.type, handler)])
    );
  };
