import { StoreKey } from "../store";
import { ActionHandlerFunc } from "../toolkit";
import { keys, TodoItem } from "./app";
import { nanoid } from "nanoid";

export const setHandler: ActionHandlerFunc<{ key: StoreKey<any>; value: any }> =
  ({ key, value }) =>
  ({ set }) => {
    set(key, value);
  };

export const addTodoItemHandler: ActionHandlerFunc =
  () =>
  ({ get, set }) => {
    const key = nanoid();
    set(keys.todoItem(key), {
      key,
      description: get(keys.todoText) ?? "",
      completed: false,
    });
    set(keys.todoList, [...(get(keys.todoList) ?? []), key]);
    set(keys.todoText, "");
  };

export const completeTodoListHandler: ActionHandlerFunc<TodoItem> =
  (todo: TodoItem) =>
  ({ get, set }) => {
    const item = get(keys.todoItem(todo.key));
    if (item) {
      return set(keys.todoItem(todo.key), {
        ...item,
        completed: !item.completed,
      });
    }
  };

export const delTodoItemHandler: ActionHandlerFunc<TodoItem> =
  (todo: TodoItem) =>
  ({ get, set, del }) => {
    del(keys.todoItem(todo.key));
    set(
      keys.todoList,
      (get(keys.todoList) ?? []).filter((i) => i !== todo.key)
    );
  };
