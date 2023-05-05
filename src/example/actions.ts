import { Action } from "../action";
import {
  SetUpdate,
  StoreUpdate,
  Store,
  ReadonlyStore,
  StoreKey,
} from "../store";
import { Keys, TodoItem } from "./app";
import { nanoid } from "nanoid";

export module Actions {
  export const set = Action.type<StoreUpdate>("set");
  export const addTodoItem = Action.type("addTodoItem");
  export const completeTodoItem = Action.type<TodoItem>("completeTodoItem");
  export const delTodoItem = Action.type<TodoItem>("delTodoItem");
}

export const set = <T>(key: StoreKey<T>, value: T) => ({
  type: Actions.set,
  payload: Store.set(key, value),
});

export const setHandler = (action: Action<SetUpdate<any>>): StoreUpdate =>
  Store.set(action.payload.key, action.payload.value);

export const addTodoItemHandler =
  (store: ReadonlyStore) =>
  (_: Action<any>): StoreUpdate[] => {
    const key = nanoid();
    return [
      Store.set(Keys.todoItem(key), {
        key,
        description: store.getOrElse(Keys.todoText, ""),
        completed: false,
      }),
      Store.set(Keys.todoList, [...store.getOrElse(Keys.todoList, []), key]),
      Store.set(Keys.todoText, ""),
    ];
  };

export const completeTodoListHandler =
  (store: ReadonlyStore) => (action: Action<TodoItem>) => {
    const item = store.get(Keys.todoItem(action.payload.key));
    if (item) {
      return Store.set(Keys.todoItem(action.payload.key), {
        ...item,
        completed: !item.completed,
      });
    }
  };

export const delTodoItemHandler =
  (store: ReadonlyStore) => (action: Action<TodoItem>) =>
    [
      Store.del(Keys.todoItem(action.payload.key)),
      Store.set(
        Keys.todoList,
        store
          .getOrElse(Keys.todoList, [])
          .filter((i) => i !== action.payload.key)
      ),
    ];
