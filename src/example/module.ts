import { Dispatcher } from "../dispatcher";
import { Store } from "../store";
import {
  Actions,
  addTodoItemHandler,
  completeTodoListHandler,
  delTodoItemHandler,
  setHandler,
} from "./actions";

import { todoPropsFactory } from "./props";

export interface TodoItem {
  key: string;
  description: string;
  completed: boolean;
}

export module Keys {
  export const todoText = Store.key<string>("todoText");
  export const todoList = Store.key<string[]>("todoList");
  export const todoItem = (key: string) =>
    Store.key<TodoItem>(`todoItem/${key}`);
}

export const store = Store.create();
store.set(Keys.todoText, "");
store.set(Keys.todoList, []);

export const [dispatcher, updates$] = Dispatcher.create(store)([
  [Actions.set, setHandler],
  [Actions.addTodoItem, addTodoItemHandler(store)],
  [Actions.completeTodoItem, completeTodoListHandler(store)],
  [Actions.delTodoItem, delTodoItemHandler(store)],
]);

updates$.subscribe((update) => {
  update instanceof Error
    ? console.log(update)
    : console.log(JSON.stringify(update));
  console.log(store.snap());
});

export const createTodoProps = todoPropsFactory(store, dispatcher);
