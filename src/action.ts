import { Observable } from "rxjs";
import { StoreKeyValue } from "./store";

export type ActionType<T> = { type: any };

export type Action<T> = {
  type: ActionType<T>;
  payload: T;
};

export type ActionHandler<T> = (
  action: Action<T>
) =>
  | StoreKeyValue<any>
  | StoreKeyValue<any>[]
  | Promise<StoreKeyValue<any> | StoreKeyValue<any>[]>
  | Observable<StoreKeyValue<any> | StoreKeyValue<any>[]>;

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
