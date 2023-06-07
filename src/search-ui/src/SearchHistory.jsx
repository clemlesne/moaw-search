import "./searchHistory.scss";
import PropTypes from "prop-types";

function SearchHistory({ historyLoaded, fetch, historySelected, setHistorySelected, deleteFromHistory }) {
  return (
    <div className="searchHistory">
      {historyLoaded.map((item, i) => (
        <span key={item.id} onMouseEnter={() => setHistorySelected(i)} className={historySelected == i ? "active" : undefined}>
          <a className="searchHistory__item__content" onMouseDown={() => fetch(item.document.search)}>
            <span>🔍</span>
            <span>{item.document.search}</span>
          </a>
          <a className="searchHistory__item__delete" onMouseDown={(e) => deleteFromHistory(i) && e.preventDefault()}>🗑️</a>
        </span>
      ))}
      <p>Search history is private and locally stored.</p>
    </div>
  )
}

SearchHistory.propTypes = {
  deleteFromHistory: PropTypes.func.isRequired,
  fetch: PropTypes.func.isRequired,
  historyLoaded: PropTypes.array.isRequired,
  historySelected: PropTypes.number,
  setHistorySelected: PropTypes.func.isRequired,
}

export default SearchHistory
