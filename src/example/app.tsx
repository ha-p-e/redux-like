import { ContextProvider } from "../connect";
import { Todo, TodoItem } from "./views";
import { setHandler, addTodoItemHandler, completeTodoListHandler, delTodoItemHandler } from "./handlers";
import { createSlice } from "../toolkit";
import { init } from "../toolkit";

export interface TodoItem {
  key: string;
  description: string;
  completed: boolean;
}

export const { keys, actions, initSlice } = createSlice({
  storeKeys: {
    todoText: init(""),
    todoList: init([] as string[]),
    todoItem: (key: string) => init<TodoItem>({ key, description: "", completed: false }),
  },
  actionHandlers: {
    set: setHandler,
    addTodoItem: addTodoItemHandler,
    completeTodoItem: completeTodoListHandler,
    delTodoItem: delTodoItemHandler,
  },
});

const { store, dispatch, updates$ } = initSlice();

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
