import { nanoid } from "nanoid";
import { of } from "rxjs";
import { StoreKey } from "../store";
import { ActionHandlerFunc } from "../toolkit";
import { keys } from "./app";

// rx handler example
export const setHandler: ActionHandlerFunc<{ key: StoreKey<any>; value: any }> =
  ({ key, value }) =>
  ({ set }) =>
    of(set(key, value));

// promise handler example
export const addTodoItemHandler: ActionHandlerFunc =
  () =>
  ({ get, set }) => {
    const key = nanoid();
    // return is needed only for testing to wait for promise to resolve
    return Promise.resolve(
      set(keys.todoItem(key), {
        key,
        description: get(keys.todoText) ?? "",
        completed: false,
      })
    )
      .then(() => set(keys.todoList, [...(get(keys.todoList) ?? []), key]))
      .then(() => set(keys.todoText, ""));
  };

// async handler example
export const completeTodoListHandler: ActionHandlerFunc<string> =
  (todoKey: string) =>
  async ({ get, set }) => {
    const item = await Promise.resolve(get(keys.todoItem(todoKey)));
    if (item) {
      set(keys.todoItem(todoKey), {
        ...item,
        completed: !item.completed,
      });
    }
  };

export const delTodoItemHandler: ActionHandlerFunc<string> =
  (todoKey: string) =>
  ({ get, set, del }) => {
    del(keys.todoItem(todoKey));
    set(
      keys.todoList,
      (get(keys.todoList) ?? []).filter((i) => i !== todoKey)
    );
  };
