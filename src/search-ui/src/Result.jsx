import "./result.scss";
import moment from "moment";
import PropTypes from "prop-types"

function Result({ metadata, score }) {
  return (
    <a href={metadata.url} target="_blank" rel="noreferrer" className="result">
      <h2 className="result__title">{metadata.title}</h2>
      <p className="result__url">{metadata.url}</p>
      <p className="result__description">
        <span className="result__sub">
          {moment(metadata.last_updated).format("l")} —{" "}
        </span>
        {metadata.description}
        <span className="result__sub">
          {" "}
          ({score.toFixed(3).toLocaleString()})
        </span>
      </p>
    </a>
  );
}

Result.propTypes = {
  metadata: PropTypes.object.isRequired,
  score: PropTypes.number.isRequired,
}

export default Result;
