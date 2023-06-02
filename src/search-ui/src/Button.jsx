import "./button.scss";
import Loader from "./Loader";
import PropTypes from "prop-types"

function Button({ disabled, onClick, text, loading, emoji }) {
  return (
    <button disabled={disabled} onClick={onClick}>
      <span>{text}</span> {(loading && <Loader />) || <span>{emoji}</span>}
    </button>
  );
}

Button.propTypes = {
  disabled: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  text: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
  emoji: PropTypes.string.isRequired,
}

export default Button;
