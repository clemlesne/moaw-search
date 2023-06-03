import "./app.scss";
import { useState, useEffect } from "react";
import axios from "axios";
import Error from "./Error";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import Result from "./Result";
import SearchBar from "./SearchBar";
import Stats from "./Stats";
import Suggestion from "./Suggestion";
import useLocalStorageState from 'use-local-storage-state';

function App() {
  const [answers, setAnswers] = useState([]);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [error, setError] = useState(null);
  const [F, setF] = useLocalStorageState("F", { defaultValue: null });
  const [stats, setStats] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionToken, setSuggestionToken] = useState(null);

  useEffect(() => {
    FingerprintJS.load()
      .then((fp) => fp.get())
      .then((res) => setF(res.visitorId));
  });

  useEffect(() => {
    if (!suggestionToken) return;
    setError(null);
    setSuggestionLoading(true);

    const fetchSuggestion = async () => {
      let job = {status: "in_progress"};
      let i = 0;

      while (true) {
        await axios
          .get(`http://127.0.0.1:8081/suggestion/${suggestionToken}`, {
            timeout: 30000,
            params: {
              user: F,
            },
          })
          .then((res) => {
            job = res.data;
          })
          .catch((error) => {
            setError({ code: error.code, message: error.message });
            job = null;
          });

        if (!(job && job.status == "in_progress") || i++ > 60) {
          break;
        }

        await delay(1000);
      }

      job && setSuggestion(job.message);
      setSuggestionLoading(false);
    };

    fetchSuggestion();
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
        if (res.data) {
          setAnswers(res.data.answers);
          setStats(res.data.stats);
          setSuggestionToken(res.data.suggestion_token);
        } else {
          setError({ code: res.status, message: "No results" });
          setAnswers([]);
          setStats(null);
          setSuggestion(null);
        }
      })
      .catch((error) => {
        setError({ code: error.code, message: error.message });
        setAnswers([]);
        setStats(null);
        setSuggestion(null);
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

const delay = ms => new Promise(res => setTimeout(res, ms));

export default App;
