import "./button.scss";
import Loader from "./Loader";
import PropTypes from "prop-types"

function Button({ disabled, onClick, text, loading, emoji }) {
  return (
    <button className="button" disabled={disabled} onClick={onClick}>
      {(loading && <Loader />) || <span>{emoji}</span>}
      <span>{text}</span>
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
