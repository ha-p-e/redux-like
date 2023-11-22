import { nanoid } from "nanoid";
import { of } from "rxjs";
import { StoreKey } from "../store";
import { ActionHandlerFunc } from "../toolkit/actionCommon";
import { keys } from "./app";

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
export const completeTodoListHandler: ActionHandlerFunc<string> = async (
  { get, set, cancelIfChanged, isCancelled },
  todoKey
) => {
  const item = await Promise.resolve(get(keys.todoItem(todoKey)));
  // cancel example
  cancelIfChanged([keys.todoItem(todoKey)]);
  await new Promise(resolve => setTimeout(resolve, 1000));
  if (!isCancelled() && item) {
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
    (get(keys.todoList) ?? []).filter(i => i !== todoKey)
  );
};
