import { Observable } from "rxjs";
import { StoreUpdate } from "./store";

export type Action<P = any, T extends string = string> = {
  type: T;
  payload: P;
};

export type ActionCreator<P, T extends string> = (payload?: P) => Action<P, T>;

export const isAction = (action: any): action is Action => "type" in action && "payload" in action;

export type ActionHandler<P, T extends string = string> = (
  action: Action<P, T>
) =>
  | Action
  | StoreUpdate
  | StoreUpdate[]
  | Promise<Action | StoreUpdate | StoreUpdate[]>
  | Observable<Action | StoreUpdate | StoreUpdate[]>
  | void;
