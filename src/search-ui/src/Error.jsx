import "./error.scss";
import PropTypes from "prop-types"

function Error({ code, message }) {
  return (
    <div className="error">
      <p>{message} ({code})</p>
    </div>
  );
}

Error.propTypes = {
  code: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
}

export default Error;
