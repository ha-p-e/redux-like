import { PropCreator, connect } from '../../connect'
import { actions, keys } from '../slice'
import TodoItem from './todoItem'

interface TodoListProps {
  todoList: string[]
  setTodoList: (list: string[]) => void
}

const TodoList = (props: TodoListProps) => (
  <div>
    {props.todoList.map(key => (
      <TodoItem key={key} todoKey={key} />
    ))}
  </div>
)

const createTodoListProps: PropCreator<TodoListProps> = ({ createProps$, dispatch }) =>
  createProps$(keys.todoList)(([list]) => ({
    todoList: list,
    setTodoList: (list: string[]) => dispatch(actions.set({ key: keys.todoList, value: list }))
  }))

export default connect(TodoList, createTodoListProps)
