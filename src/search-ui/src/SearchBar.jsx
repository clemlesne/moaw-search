import "./searchBar.scss"
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
        type="search"
        placeholder="Search accross workshops..."
        value={value}
        onChange={handleSearchInputChange}
        onKeyDown={(e) => (e.key === "Enter" && value.length > 0) ? fetchAnswers(value) : null }
      />
      <Button disabled={value.length == 0 || loading} onClick={() => fetchAnswers(value)} text="Search" loading={loading} emopji="🔎" />
    </div>
  );
};

export default SearchBar;
