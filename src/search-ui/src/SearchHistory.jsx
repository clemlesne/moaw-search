import "./searchHistory.scss";
import PropTypes from "prop-types";

function SearchHistory({ history, setValue }) {
  return (
    <div className="searchHistory">
      {history.map((item) => (
        <a key={item.id} onMouseDown={() => setValue(item.document.search)}>{item.document.search}</a>
      ))}
      <p>Search history is private and locally stored.</p>
    </div>
  )
}

SearchHistory.propTypes = {
  history: PropTypes.array.isRequired,
  setValue: PropTypes.func.isRequired,
}

export default SearchHistory
