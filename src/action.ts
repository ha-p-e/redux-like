import { Observable } from "rxjs";
import { StoreUpdate } from "./store";

export type ActionType<T> = { type: string };

export type Action<T> = {
  type: ActionType<T>;
  payload: T;
};

export type ActionHandler<T> = (
  action: Action<T>
) =>
  | StoreUpdate
  | StoreUpdate[]
  | Promise<StoreUpdate | StoreUpdate[]>
  | Observable<StoreUpdate | StoreUpdate[]>
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
