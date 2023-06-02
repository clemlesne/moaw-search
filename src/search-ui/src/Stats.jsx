import "./stats.scss";
import PropTypes from "prop-types"

function Stats({ total, time }) {
  return (
    <p className="stats">
      About {total} results ({time.toFixed(3).toLocaleString()} seconds)
    </p>
  );
}

Stats.propTypes = {
  total: PropTypes.number.isRequired,
  time: PropTypes.number.isRequired,
}

export default Stats;
