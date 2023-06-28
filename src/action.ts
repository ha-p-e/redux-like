import { Observable } from "rxjs";
import { StoreUpdate } from "./store";

export type ActionType<T> = { type: string };

export type Action<T = any> = {
  type: ActionType<T>;
  payload: T;
};

export const isAction = (action: any): action is Action => "type" in action && "payload" in action;

export type ActionHandler<T> = (
  action: Action<T>
) =>
  | Action
  | StoreUpdate
  | StoreUpdate[]
  | Promise<Action | StoreUpdate | StoreUpdate[]>
  | Observable<Action | StoreUpdate | StoreUpdate[]>
  | void;

const type = <T>(type: string): ActionType<T> => ({ type });

function create<T>(type: ActionType<T>): Action<T>;
function create<T>(type: ActionType<T>, payload: T): Action<T>;
function create<T>(
  type: ActionType<T>,
  payload?: T
): Action<T> | Action<unknown> {
  return { type, payload };
}

export const Action = { type, create };
