import { nanoid } from "nanoid";
import { of } from "rxjs";
import { StoreKey } from "../store";
import { ActionHandlerFunc } from "../toolkit";
import { keys } from "./app";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// rx handler example
export const setHandler: ActionHandlerFunc<{ key: StoreKey<any>; value: any }> = async ({ set }, { key, value }) =>
  of(set(key, value));

// promise handler example
export const addTodoItemHandler: ActionHandlerFunc = ({ get, set }) => {
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
export const completeTodoListHandler: ActionHandlerFunc<string> = async ({ get, set, cancel }, todoKey) => {
  const item = await Promise.resolve(get(keys.todoItem(todoKey)));
  // cancel example
  const token = cancel([keys.todoItem(todoKey)]);
  await delay(1000);
  if (!token.isCancelled && item) {
    set(keys.todoItem(todoKey), {
      ...item,
      completed: !item.completed,
    });
  }
};

export const delTodoItemHandler: ActionHandlerFunc<string> = ({ get, set, del }, todoKey) => {
  del(keys.todoItem(todoKey));
  set(
    keys.todoList,
    (get(keys.todoList) ?? []).filter((i) => i !== todoKey)
  );
};
