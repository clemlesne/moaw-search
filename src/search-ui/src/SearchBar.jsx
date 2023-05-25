import { useState } from "react";
import "./searchBar.scss"

const SearchBar = ({ fetchAnswers, loading }) => {
  const [value, setValue] = useState("");

  const handleSearchInputChange = (e) => {
    setValue(e.target.value);
  };

  return (
    <div className="search">
      <h1>MOAW Search</h1>
      <input
        type="search"
        placeholder="Search accross workshops..."
        value={value}
        onChange={handleSearchInputChange}
        onKeyDown={(e) => (e.key === "Enter" && value.length > 0) ? fetchAnswers(value) : null }
      />
      <button disabled={value.length == 0 || loading} onClick={() => fetchAnswers(value)}>
        Search {loading && <>🔄</> || <>🐱</>}
      </button>
    </div>
  );
};

export default SearchBar;
