import { useState } from "react";
import axios from "axios";
import Result from "./Result";
import SearchBar from "./SearchBar";
import Error from "./Error";
import Suggestion from "./Suggestion";
import Stats from "./Stats";
import "./app.scss"

function App() {
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [suggestion, setSuggestion] = useState("");

  const fetchData = async (value) => {
    setLoading(true);
    await axios.get(
        `http://127.0.0.1:8081/search?query=${value}&limit=10`,
        {
          retries: 3,
          timeout: 30000,
        },
      )
      .then((res) => {
        setError("");
        setAnswers(res.data.answers);
        setStats(res.data.stats);
        setSuggestion(res.data.suggestion.message);
      })
      .catch((error) => {
        setError({ code: error.code, message: error.message });
        setAnswers([]);
        setStats(null);
        setSuggestion("");
      })
      .finally(() => setLoading(false));
  };

  return (
    <>
      <SearchBar
        fetchData={fetchData}
        loading={loading}
      />
      <div className={`results ${loading && "results--loading"}`}>
        {error && <Error code={error.code} message={error.message} />}
        {stats && <Stats total={stats.total} time={stats.time} />}
        {suggestion && <Suggestion message={suggestion} />}
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
