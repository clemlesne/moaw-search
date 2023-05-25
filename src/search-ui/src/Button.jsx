import "./button.scss"
import Loader from "./Loader";

function Button({ disabled, onClick, text, loading, emopji }) {
  return (
    <button disabled={disabled} onClick={onClick}>
      <span>{text}</span> {loading && <Loader /> || <span>{emopji}</span>}
    </button>
  )
}

export default Button
