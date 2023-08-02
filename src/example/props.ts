import { map } from "rxjs";
import { actions, keys, TodoItem } from "./app";
import { PropCreator } from "../connect";

export interface AddTodoProps {
  addTodoText: string;
  setAddTodoText: (text: string) => void;
  addTodo: () => void;
}

export interface TodoItemProps {
  item: TodoItem;
  delete: () => void;
  completed: () => void;
}

export interface TodoListProps {
  todoList: string[];
  setTodoList: (list: string[]) => void;
}

export const createAddTodoProps: PropCreator<AddTodoProps> =
  () =>
  ({ get$, dispatch }) =>
    get$(keys.todoText).pipe(
      map((addTodoText) => ({
        addTodoText,
        setAddTodoText: (text: string) => dispatch(actions.set({ key: keys.todoText, value: text })),
        addTodo: () => dispatch(actions.addTodoItem()),
      }))
    );

export const createTodoItemProps: PropCreator<TodoItemProps, { todoKey: string }> =
  (props: { todoKey: string }) =>
  ({ get$, dispatch }) =>
    get$(keys.todoItem(props.todoKey)).pipe(
      map((item) => ({
        item,
        delete: () => dispatch(actions.delTodoItem(item)),
        completed: () => dispatch(actions.completeTodoItem(item)),
      }))
    );

export const createTodoListProps: PropCreator<TodoListProps> =
  () =>
  ({ get$, dispatch }) =>
    get$(keys.todoList).pipe(
      map((list) => ({
        todoList: list,
        setTodoList: (list: string[]) => dispatch(actions.set({ key: keys.todoList, value: list })),
      }))
    );
