import "./app.scss"
import { useState } from "react";
import axios from "axios";
import Error from "./Error";
import Result from "./Result";
import SearchBar from "./SearchBar";
import Stats from "./Stats";
import Suggestion from "./Suggestion";

function App() {
  const [answers, setAnswers] = useState([]);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [suggestion, setSuggestion] = useState("");
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const fetchSuggestion = async (token) => {
    setSuggestionLoading(true);
    setSuggestion("");
    await axios.get(
        `http://127.0.0.1:8081/suggestion/${token}`,
        {
          timeout: 30000,
        },
      )
      .then((res) => {
        setError("");
        setSuggestion(res.data.message);
      })
      .catch((error) => {
        setError({ code: error.code, message: error.message });
        setSuggestion("");
      })
      .finally(() => setSuggestionLoading(false));
  };

  const fetchAnswers = async (value) => {
    setAnswersLoading(true);
    await axios.get(
        `http://127.0.0.1:8081/search?query=${value}&limit=10`,
        {
          timeout: 30000,
        },
      )
      .then((res) => {
        setError("");
        setAnswers(res.data.answers);
        setStats(res.data.stats);
        fetchSuggestion(res.data.suggestion_token);
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
      <SearchBar
        fetchAnswers={fetchAnswers}
        loading={answersLoading}
      />
      <div className={`results ${answersLoading && "results--answersLoading"}`}>
        {error && <Error code={error.code} message={error.message} />}
        {stats && <Stats total={stats.total} time={stats.time} />}
        {(suggestion || suggestionLoading) && <Suggestion message={suggestion} loading={suggestionLoading} />}
        {answers.map((answer) => (
          <Result key={answer.metadata.id} metadata={answer.metadata} score={answer.score} />
        ))}
      </div>
      <footer className="footer">
        <span>{import.meta.env.VITE_VERSION} ({import.meta.env.MODE})</span>
      </footer>
    </>
  );
}

export default App;
