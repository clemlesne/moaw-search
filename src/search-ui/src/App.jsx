import "./app.scss";
import { Helmet } from "react-helmet-async";
import { helmetJsonLdProp } from "react-schemaorg";
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Error from "./Error";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import Result from "./Result";
import SearchBar from "./SearchBar";
import Stats from "./Stats";
import Suggestion from "./Suggestion";
import useLocalStorageState from "use-local-storage-state";

function App() {
  // Constants
  const API_BASE_URL = "http://127.0.0.1:8081";
  // State
  const [answers, setAnswers] = useState(null);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [suggestionLoading, setSuggestionLoading] = useState(null);
  const [suggestionToken, setSuggestionToken] = useState(null);
  // Persistance
  const [F, setF] = useLocalStorageState("F", { defaultValue: null });

  // Init the FingerPrintJS from the browser
  useMemo(() => {
    FingerprintJS.load()
      .then((fp) => fp.get())
      .then((res) => setF(res.visitorId));
  }, []);

  // Fetch the suggestion
  useEffect(() => {
    if (!suggestionToken) return;
    if (!F) return;

    // Reset UI
    setError(null);
    setSuggestion(null);

    // Close previous connection
    if (suggestionLoading) suggestionLoading.close();

    const fetch = async () => {
      // Open new connection
      const source = new EventSource(`${API_BASE_URL}/suggestion/${suggestionToken}?user=${F}`);
      // Store the connection to be able to close it later
      setSuggestionLoading(source);

      let suggestion = "";
      source.onmessage = (event) => {
        suggestion += event.data;
        setSuggestion(suggestion);
      };

      source.onerror = (event) => {
        if (event.eventPhase === EventSource.CLOSED) {
          setSuggestionLoading(null);
          source.close();
        }
      }
    };

    fetch();
  }, [suggestionToken, F]);

  const fetchAnswers = async (value) => {
    setAnswersLoading(true);
    setError(null);
    await axios
      .get(`${API_BASE_URL}/search`, {
        params: {
          limit: 10,
          query: value,
          user: F,
        },
        timeout: 30000,
      })
      .then((res) => {
        if (res.data) {
          setAnswers(res.data.answers);
          setStats(res.data.stats);
          setSuggestionToken(res.data.suggestion_token);
        } else {
          // Hardcoded error message ; functionally, this is due to a moderated query
          setError({ code: res.status, message: "No results" });
          // Reset UI
          setAnswers(null);
          setStats(null);
          setSuggestion(null);
        }
      })
      .catch((error) => {
        setError({ code: error.code, message: error.message });
        // Reset UI
        setAnswers(null);
        setStats(null);
        setSuggestion(null);
      })
      .finally(() => setAnswersLoading(false));
  };

  return (
    <>
      <Helmet script={[
        helmetJsonLdProp({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          alternateName: "MOAW AI",
          applicationCategory: "SearchApplication",
          applicationSubCategory: "SearchEngine",
          browserRequirements: "Requires JavaScript, HTML5, CSS3.",
          countryOfOrigin: "France",
          description: "A search engine for the MOAW dataset",
          image: "/assets/fluentui-emoji-cat.svg",
          inLanguage: "en-US",
          isAccessibleForFree: true,
          learningResourceType: "workshop",
          license: "https://github.com/clemlesne/moaw-search/blob/main/LICENCE",
          name: "MOAW Search",
          releaseNotes: "https://github.com/clemlesne/moaw-search/releases",
          teaches: "Usage of Microsoft Azure, technology, artificial intelligence, network, cloud native skills.",
          typicalAgeRange: "16-",
          version: import.meta.env.VITE_VERSION,
          sourceOrganization: {
            "@type": "Organization",
            name: "Microsoft",
            url: "https://microsoft.com",
          },
          potentialAction: {
            "@type": "SearchAction",
            target: "/?q={search_term_string}",
          },
          maintainer: {
            "@type": "Person",
            email: "clemence@lesne.pro",
            name: "Clémence Lesne",
          },
          isPartOf: {
            "@type": "WebSite",
            name: "MOAW",
            url: "https://microsoft.github.io/moaw",
          },
        }),
      ]} />
      <SearchBar fetchAnswers={fetchAnswers} loading={answersLoading} />
      <div className={`results ${answersLoading ? "results--answersLoading" : undefined}`}>
        {error && <Error code={error.code} message={error.message} />}
        {stats && <Stats total={stats.total} time={stats.time} />}
        {(suggestion || suggestionLoading) && (
          <Suggestion message={suggestion} loading={suggestionLoading != null} />
        )}
        {answers && answers.map((answer) => (
          <Result
            key={answer.id}
            metadata={answer.metadata}
            score={answer.score}
          />
        ))}
      </div>
      <footer className="footer">
        <span>
          {import.meta.env.VITE_VERSION} ({import.meta.env.MODE})
        </span>
        <a
          href="https://github.com/clemlesne/moaw-search"
          target="_blank"
          rel="noreferrer"
        >
          Source code is open, let&apos;s talk about it!
        </a>
      </footer>
    </>
  );
}

export default App;
