import { Observable } from "rxjs";
import { StoreUpdate } from "./store";

export type ActionType<T> = { type: any };

export type Action<T> = {
  type: ActionType<T>;
  payload: T;
};

export type ActionHandler<T> = (
  action: Action<T>
) =>
  | StoreUpdate<any>
  | StoreUpdate<any>[]
  | Promise<StoreUpdate<any> | StoreUpdate<any>[]>
  | Observable<StoreUpdate<any> | StoreUpdate<any>[]>;

export module Action {
  export const type = <T>(type: any): ActionType<T> => ({ type });

  export function create<T>(type: ActionType<T>): Action<T>;
  export function create<T>(type: ActionType<T>, payload: T): Action<T>;
  export function create<T>(
    type: ActionType<T>,
    payload?: T
  ): Action<T> | Action<unknown> {
    return { type, payload };
  }
}
