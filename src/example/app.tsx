import { ContextProvider } from "../connect";
import { setHandler, addTodoItemHandler, completeTodoListHandler, delTodoItemHandler } from "./handlers";
import { createSlice } from "../toolkit";
import { init } from "../toolkit";
import AddTodo from "./components/addTodo";
import TodoList from "./components/todoList";

export interface Todo {
  key: string;
  description: string;
  completed: boolean;
}

export const { keys, actions, initSlice } = createSlice({
  keys: {
    todoText: init(""),
    todoList: init([] as string[]),
    todoItem: (key: string) => init<Todo>({ key, description: "", completed: false }),
  },
  actions: {
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
    <div>
      <AddTodo />
      <TodoList />
    </div>
  </ContextProvider>
);
