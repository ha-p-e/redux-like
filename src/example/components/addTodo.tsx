import { PropCreator, connect } from "../../connect";
import { actions, keys } from "../app";

interface AddTodoProps {
  addTodoText: string;
  setAddTodoText: (text: string) => void;
  addTodo: () => void;
}

const AddTodo = (props: AddTodoProps) => (
  <div>
    <input type="text" value={props.addTodoText} onChange={(e) => props.setAddTodoText(e.target.value)} />
    <button onClick={() => props.addTodo()} disabled={props.addTodoText === ""}>
      +
    </button>
  </div>
);

const createAddTodoProps: PropCreator<AddTodoProps> = ({ createProps$, dispatch }) =>
  createProps$(keys.todoText)(([addTodoText]) => ({
    addTodoText,
    setAddTodoText: (text: string) => dispatch(actions.set({ key: keys.todoText, value: text })),
    addTodo: () => dispatch(actions.addTodoItem()),
  }));

export default connect(AddTodo, createAddTodoProps);
