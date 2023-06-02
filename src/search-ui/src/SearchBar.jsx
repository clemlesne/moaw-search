import "./searchBar.scss";
import { useState } from "react";
import Button from "./Button";

function SearchBar({ fetchAnswers, loading }) {
  const [value, setValue] = useState("");
  const [lastValue, setLastValue] = useState("");

  const fetch = (value) => {
    if(value != lastValue) {
      fetchAnswers(value)
    }
    setLastValue(value)
  };

  return (
    <div className="search">
      <h1><span>🐱</span> <span>MOAW Search</span></h1>
      <input
        name="search"
        size="1"
        maxLength="200"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) =>
          (value.length > 0 && e.key === "Enter") && fetch(value)
        }
        onBlur={() => (value.length > 0 && !loading) && fetch(value)}
        placeholder="Search accross workshops..."
        type="search"
        value={value}
      />
      <Button
        disabled={value.length == 0}
        onClick={() => fetch(value)}
        text="Search"
        loading={loading}
        emopji="🔎"
      />
    </div>
  );
}

export default SearchBar;
