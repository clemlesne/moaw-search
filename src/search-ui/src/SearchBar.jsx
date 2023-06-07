import "./searchBar.scss";
import { create, insert, search, save, load, remove } from "@orama/orama";
import { useSearchParams } from "react-router-dom";
import { useState, useMemo } from "react";
import Button from "./Button";
import PropTypes from "prop-types"
import SearchHistory from "./SearchHistory";
import useLocalStorageState from "use-local-storage-state";

function SearchBar({ fetchAnswers, loading }) {
  // Constants
  const SEARCH_LIMIT = 5;
  // State
  const [historyDb, setHistoryDb] = useState(null);
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(null);
  const [historySelected, setHistorySelected] = useState(null);
  const [lastValue, setLastValue] = useState("");
  // Persistance
  const [historyPersistance, setHistoryPersistance] = useLocalStorageState("historyPersistance", { defaultValue: null });
  const [value, setValue] = useState(null);
  // Params
  let [searchParams, setSearchParams] = useSearchParams();

  // Init the value from the URL
  useMemo(() => {
    setValue(searchParams.get("q"));
  }, []);

  const executeSearch = async (value) => {
    // First, persit the value
    setValue(value);

    if (!historyDb) return;

    let res = null;
    if (!value) {  // If the value is empty, display the last searches
      res = await search(historyDb, {
        limit: SEARCH_LIMIT,
        sortBy: {
          order: "DESC",
          property: "date",
        },
      });
    } else {  // If the value is not empty, display the most relevant searches
      res = await search(historyDb, {
        limit: SEARCH_LIMIT,
        properties: ["search"],
        term: value,
        tolerance: 5,
      });
    }

    setHistoryLoaded(res.hits);

    // Display the history after the results are loaded
    setHistoryEnabled(true);
  };

  // Fetch the answers
  const fetch = async (value) => {
    // Disable the history ; do it first to have a better UX
    setHistoryEnabled(false);
    setHistorySelected(null);

    // Update the URL
    setSearchParams({ q: value });

    // First, persit the value
    setValue(value);

    // Execute search only if the value has changed
    if(value != lastValue) {
      // In case the user clicks again on the search button
      setLastValue(value);

      // Cancel the search if the value is empty
      if (!value) return;
      fetchAnswers(value);

      // Cancel the save if the value is empty
      if (!historyDb) return;

      // Search for duplicates
      const res = await search(historyDb, {
        exact: true,
        properties: ["search"],
        term: value,
      });

      // Confirm that the duplicates is well in the history
      const obj = res.hits[0];
      if (res.hits.length > 0 && obj.document.search == value) {
        await remove(historyDb, obj.id);
      }

      // Insert the new search
      await insert(historyDb, {
        date: Date.now(),
        search: value,
      });
    }
  };

  // Handle the keyboard events
  const onKeyDown = async (e) => {
    switch (e.key) {
      case "Escape":
        setHistoryEnabled(false);
        break;

      case "ArrowDown":
        setHistoryEnabled(true);
        setHistorySelected(historySelected < (historyLoaded.length - 1) ? historySelected + 1 : 0);
        e.preventDefault();
        break;

      case "ArrowUp":
        setHistoryEnabled(true);
        setHistorySelected(historySelected > 0 ? historySelected - 1 : (historyLoaded.length - 1));
        e.preventDefault();
        break;

      case "Enter":
        // If the user hasn't selected a history, fetch the value ; else, fetch the history
        fetch((!historySelected) ? e.target.value : historyLoaded[historySelected].document.search)
        e.preventDefault();
        break;

      default:
        setHistorySelected(null);
        break;
    }
  };

  const deleteFromHistory = async (i) => {
    await remove(historyDb, historyLoaded[i].id);
    executeSearch(value);
  };

  // Load the history database
  useMemo(() => {
    const loadOrCreate = async () => {
      const db = await create({
        schema: {
          search: "string",
          date: "number",
        },
        // Stemming is a technique that reduces words to their root form
        // See: https://docs.oramasearch.com/text-analysis/stemming
        language: "english",
        components: {
          // Save the database after each insert
          afterInsert: async (db) => {
            const cold = await save(db);
            setHistoryPersistance(cold);
          },
        },
      });

      if (historyPersistance) {
        await load(db, historyPersistance);
      }

      setHistoryDb(db);
    };

    loadOrCreate();
  }, []);

  return (
    <div className="searchBar">
      <h1><span>🐱</span> <span>MOAW Search</span></h1>
      <span>
        <input
          autoComplete="off"
          maxLength="200"
          name="search"
          onBlur={(e) => fetch(e.target.value)}
          onChange={(e) => executeSearch(e.target.value)}
          onClick={() => setHistoryEnabled(true)}
          onFocus={(e) => executeSearch(e.target.value)}
          onKeyDown={(e) => onKeyDown(e)}
          placeholder="Search accross workshops..."
          size="1"
          type="search"
          value={value ? value : ""}
        />
        {(historyEnabled && historyLoaded && historyLoaded.length > 0) && <SearchHistory historyLoaded={historyLoaded} historySelected={historySelected} setHistorySelected={setHistorySelected} fetch={fetch} deleteFromHistory={deleteFromHistory} />}
      </span>
      <Button
        disabled={!(value && value.length > 0)}
        emoji="🧠"
        loading={loading}
        onClick={() => fetch(value)}
        text="Search"
      />
    </div>
  );
}

SearchBar.propTypes = {
  fetchAnswers: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
}

export default SearchBar;
