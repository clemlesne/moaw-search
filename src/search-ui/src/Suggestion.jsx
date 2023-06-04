import "./suggestion.scss"
import Loader from "./Loader";
import PropTypes from "prop-types"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

function Suggestion({ message, loading }) {
  return (
    <div className="suggestion">
      {(loading && !message) && <Loader />}
      { /* eslint-disable-next-line react/no-children-prop */ }
      {message && <ReactMarkdown linkTarget="_blank" remarkPlugins={[remarkGfm]} children={(loading && `${message} …`) || message} />}
      <span className="suggestion__sub">AI generated results can be wrong.</span>
    </div>
  )
}

Suggestion.propTypes = {
  message: PropTypes.string,
  loading: PropTypes.bool.isRequired,
}

export default Suggestion
