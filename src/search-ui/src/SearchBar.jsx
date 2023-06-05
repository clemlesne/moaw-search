import "./searchBar.scss";
import { create, insert, search, save, load, remove } from "@orama/orama";
import { useState, useEffect } from "react";
import Button from "./Button";
import PropTypes from "prop-types"
import useLocalStorageState from "use-local-storage-state";
import SearchHistory from "./SearchHistory";

function SearchBar({ fetchAnswers, loading }) {
  const [historyDb, setHistoryDb] = useState(null);
  const [historyLoaded, setHistoryLoaded] = useState(null);
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const [historyPersistance, setHistoryPersistance] = useLocalStorageState("historyPersistance", { defaultValue: null });
  const [lastValue, setLastValue] = useState("");
  const [value, setValue] = useLocalStorageState("value", { defaultValue: "" });

  useEffect(() => {
    const loadOrCreate = async () => {
      const db = await create({
        schema: {
          search: "string",
          date: "number",
        },
        components: {
          afterInsert: async (db) => {
            const cold = await save(db);
            setHistoryPersistance(cold);
          }
        },
      });

      if (historyPersistance) {
        await load(db, historyPersistance);
      }

      setHistoryDb(db);
    };

    loadOrCreate();
  }, []);

  useEffect(() => {
    if (!historyDb) return;
    if (!value) return;

    const executeSearch = async () => {
      const res = await search(historyDb, {
        limit: 10,
        properties: ["search"],
        term: value,
        tolerance: 5,
        sortBy: {
          order: "DESC",
          property: "date",
        }
      });

      console.log(res.hits);
      setHistoryLoaded(res.hits);
    };

    executeSearch();
  }, [value]);

  const fetch = (value) => {
    const persistHistory = async () => {
      if (!historyDb) return;

      const res = await search(historyDb, {
        exact: true,
        properties: ["search"],
        term: value,
      });

      if (res.hits.length > 0 && res.hits[0].document.search == value) {
        console.log("Remove", res.hits[0].id);
        await remove(historyDb, res.hits[0].id);
      }

      await insert(historyDb, {
        date: Date.now(),
        search: value,
      });
    };

    // Execute search only if the value has changed
    if(value != lastValue) {
      persistHistory();
      fetchAnswers(value);
    }

    // In case the user clicks again on the search button
    setLastValue(value);
  };

  return (
    <div className="searchBar">
      <h1><span>🐱</span> <span>MOAW Search</span></h1>
      <span>
        <input
          name="search"
          autoComplete="off"
          size="1"
          maxLength="200"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => (value.length > 0 && e.key === "Enter") && fetch(value)}
          onFocus={() => setHistoryEnabled(true)}
          onBlur={() => {
            setHistoryEnabled(false);
            // Force the search to be executed when the user clicks outside the search bar
            if (value.length > 0 && !loading) fetch(value);
          }}
          placeholder="Search accross workshops..."
          type="search"
          value={value}
        />
        {(historyEnabled && historyLoaded && historyLoaded.length > 0) && <SearchHistory history={historyLoaded} setValue={setValue} />}
      </span>
      <Button
        disabled={value.length == 0}
        onClick={() => fetch(value)}
        text="Search"
        loading={loading}
        emoji="🔎"
      />
    </div>
  );
}

SearchBar.propTypes = {
  fetchAnswers: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
}

export default SearchBar;
