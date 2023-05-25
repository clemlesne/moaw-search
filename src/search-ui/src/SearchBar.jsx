import "./searchBar.scss";
import { useState } from "react";
import Loader from "./Loader";
import Button from "./Button";

const SearchBar = ({ fetchAnswers, loading }) => {
  const [value, setValue] = useState("");

  const handleSearchInputChange = (e) => {
    setValue(e.target.value);
  };

  return (
    <div className="search">
      <h1>🐱 MOAW Search</h1>
      <input
        name="search"
        onChange={handleSearchInputChange}
        onKeyDown={(e) =>
          value.length > 0 && e.key === "Enter" && fetchAnswers(value)
        }
        onBlur={() => (value.length > 0 && !loading) && fetchAnswers(value)}
        placeholder="Search accross workshops..."
        type="search"
        value={value}
      />
      <Button
        disabled={value.length == 0}
        onClick={() => fetchAnswers(value)}
        text="Search"
        loading={loading}
        emopji="🔎"
      />
    </div>
  );
};

export default SearchBar;
