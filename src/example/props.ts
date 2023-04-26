import { map, Observable, of } from "rxjs";
import { Actions, set, TodoItem, todoList, todoText } from "./module";
import { Dispatcher } from "../dispatcher";
import { ReadonlyStore } from "../store";
import { Action } from "../action";

export interface AddTodoProps {
  addTodoText: string;
  setAddTodoText: (text: string) => void;
  addTodo: () => void;
}

export interface TodoItemProps {
  item: TodoItem;
  delete: () => void;
  check: () => void;
}

export interface TodoListProps {
  todoList: TodoItem[];
  setTodoList: (list: TodoItem[]) => void;
  createTodoItemProps: (item: TodoItem) => Observable<TodoItemProps>;
}

export interface TodoProps {
  createAddTodoProps: () => Observable<AddTodoProps>;
  createTodoListProps: () => Observable<TodoListProps>;
}

export const todoPropsFactory = (
  store: ReadonlyStore,
  dispatch: Dispatcher
) => {
  const createAddTodoProps = (): Observable<AddTodoProps> =>
    store.get$(todoText).pipe(
      map((addTodoText) => ({
        addTodoText,
        setAddTodoText: (text: string) => dispatch(set(todoText, text)),
        addTodo: () => dispatch(Action.create(Actions.addTodoText, null)),
      }))
    );

  const createTodoItemProps = (item: TodoItem): Observable<TodoItemProps> =>
    of({
      item: item,
      delete: () => dispatch(Action.create(Actions.delTodoItem, item)),
      check: () => dispatch(Action.create(Actions.checkTodoItem, item)),
    });

  const createTodoListProps = (): Observable<TodoListProps> =>
    store.get$(todoList).pipe(
      map((list) => ({
        todoList: list,
        setTodoList: (list: TodoItem[]) => dispatch(set(todoList, list)),
        createTodoItemProps,
      }))
    );

  return (): TodoProps => ({
    createAddTodoProps,
    createTodoListProps,
  });
};
