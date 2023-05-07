import { Dispatcher } from "../dispatcher";
import { ContextProvider } from "../connect";
import { Store } from "../store";
import {
  Actions,
  addTodoItemHandler,
  completeTodoListHandler,
  delTodoItemHandler,
  setHandler,
} from "./actions";
import { Todo, TodoItem } from "./views";

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

export const [dispatch, updates$] = Dispatcher.create(store)([
  [Actions.set, setHandler],
  [Actions.addTodoItem, addTodoItemHandler(store)],
  [Actions.completeTodoItem, completeTodoListHandler(store)],
  [Actions.delTodoItem, delTodoItemHandler(store)],
]);

updates$.subscribe((update) => {
  if (update instanceof Error) console.log(update);
  else if ("type" in update) console.log(`action: ${JSON.stringify(update)}`);
  else if (Array.isArray(update)) {
    console.log(`update: ${JSON.stringify(update)}`);
    console.log("store:", store.snap());
  }
});

export const App = () => (
  <ContextProvider context={{ store, dispatch }}>
    <Todo />
  </ContextProvider>
);
