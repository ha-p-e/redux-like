import { Action } from "../action";
import { Dispatcher } from "../dispatcher";
import {
  ReadonlyStore,
  Store,
  StoreKey,
  StoreUpdate,
  SetUpdate,
} from "../store";
import { nanoid } from "nanoid";
import { todoPropsFactory } from "./props";

export interface TodoItem {
  key: string;
  description: string;
  completed: boolean;
}

export const store = Store.create();
export const todoText = Store.key<string>("todoText");
export const todoList = Store.key<TodoItem[]>("todoList");

store.set(todoText, "");
store.set(todoList, []);

export module Actions {
  export const set = Action.type<StoreUpdate<any>>("set");
  export const addTodoText = Action.type("addTodoText");
  export const checkTodoItem = Action.type<TodoItem>("completeTodoItem");
  export const delTodoItem = Action.type<TodoItem>("delTodoItem");
}

export const set = <T>(key: StoreKey<T>, value: T) => ({
  type: Actions.set,
  payload: Store.update(key, value),
});

const setHandler = (action: Action<SetUpdate<any>>): StoreUpdate<any> =>
  Store.update(action.payload.key, action.payload.value);

const addTodoTextHandler =
  (store: ReadonlyStore) =>
  (action: Action<any>): StoreUpdate<any>[] =>
    [
      Store.update(todoList, [
        ...store.getOrElse(todoList, []),
        {
          key: nanoid(),
          description: store.getOrElse(todoText, ""),
          completed: false,
        },
      ]),
      Store.update(todoText, ""),
    ];

const completeTodoListHandler =
  (store: ReadonlyStore) => (action: Action<TodoItem>) =>
    Store.update(
      todoList,
      store
        .getOrElse(todoList, [])
        .map((i) =>
          i.key === action.payload.key
            ? { ...action.payload, completed: !action.payload.completed }
            : i
        )
    );

const delTodoItemHandler =
  (store: ReadonlyStore) => (action: Action<TodoItem>) =>
    Store.update(
      todoList,
      store.getOrElse(todoList, []).filter((i) => i.key !== action.payload.key)
    );

export const [dispatcher, actions$, updates$] = Dispatcher.create(store)([
  [Actions.set, setHandler],
  [Actions.addTodoText, addTodoTextHandler(store)],
  [Actions.checkTodoItem, completeTodoListHandler(store)],
  [Actions.delTodoItem, delTodoItemHandler(store)],
]);

actions$.subscribe((action) =>
  console.log(`action: ${JSON.stringify(action)}`)
);

updates$.subscribe((updates) =>
  console.log(`updates: ${JSON.stringify(updates)}`)
);

export const createTodoProps = todoPropsFactory(store, dispatcher);
