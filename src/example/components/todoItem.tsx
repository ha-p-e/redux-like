import { connect, PropCreator } from "../../connect";
import { actions, keys } from "../slice";
import { Todo } from "../types";

interface TodoItemProps {
  item: Todo;
  delete: () => void;
  completed: () => void;
}

const TodoItem = (props: TodoItemProps) => (
  <div key={props.item.key}>
    <input type="checkbox" checked={props.item.completed} onChange={() => props.completed()} />
    <span
      style={{
        textDecoration: props.item.completed ? "line-through" : undefined,
      }}
    >
      {props.item.description}
    </span>
    <button onClick={() => props.delete()}>x</button>
  </div>
);

const createTodoItemProps: PropCreator<TodoItemProps, { todoKey: string }> = (
  { createProps$, dispatch },
  props: { todoKey: string }
) =>
  createProps$(keys.todoItem(props.todoKey))(([item]) => ({
    item,
    delete: () => dispatch(actions.delTodoItem(item.key)),
    completed: () => dispatch(actions.completeTodoItem(item.key)),
  }));

export default connect(TodoItem, createTodoItemProps);
