import "./app.scss";
import { useState, useEffect } from "react";
import axios from "axios";
import Error from "./Error";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import Result from "./Result";
import SearchBar from "./SearchBar";
import Stats from "./Stats";
import Suggestion from "./Suggestion";

function App() {
  const [answers, setAnswers] = useState([]);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [error, setError] = useState(null);
  const [F, setF] = useState(null);
  const [stats, setStats] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionToken, setSuggestionToken] = useState(null);

  useEffect(() => {
    FingerprintJS.load()
      .then((fp) => fp.get())
      .then((res) => setF(res.visitorId));
  }, []);

  useEffect(() => {
    if (!suggestionToken) return;
    setError(null);
    setSuggestionLoading(true);
    axios
      .get(`http://127.0.0.1:8081/suggestion/${suggestionToken}`, {
        timeout: 30000,
        params: {
          user: F,
        },
      })
      .then((res) => {
        setSuggestion(res.data.message);
      })
      .catch((error) => {
        setError({ code: error.code, message: error.message });
      })
      .finally(() => setSuggestionLoading(false));
  }, [suggestionToken, F]);

  const fetchAnswers = async (value) => {
    setAnswersLoading(true);
    setError(null);
    await axios
      .get("http://127.0.0.1:8081/search", {
        params: {
          limit: 10,
          query: value,
          user: F,
        },
        timeout: 30000,
      })
      .then((res) => {
        setAnswers(res.data.answers);
        setStats(res.data.stats);
        setSuggestionToken(res.data.suggestion_token);
      })
      .catch((error) => {
        setError({ code: error.code, message: error.message });
        setAnswers([]);
        setStats(null);
      })
      .finally(() => setAnswersLoading(false));
  };

  return (
    <>
      <SearchBar fetchAnswers={fetchAnswers} loading={answersLoading} />
      <div className={`results ${answersLoading && "results--answersLoading"}`}>
        {error && <Error code={error.code} message={error.message} />}
        {stats && <Stats total={stats.total} time={stats.time} />}
        {(suggestion || suggestionLoading) && (
          <Suggestion message={suggestion} loading={suggestionLoading} />
        )}
        {answers.map((answer) => (
          <Result
            key={answer.metadata.id}
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
          Source code is open, let's talk about it!
        </a>
      </footer>
    </>
  );
}

export default App;
