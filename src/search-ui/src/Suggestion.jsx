import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import "./suggestion.scss"

function Suggestion({ message }) {
  return (
    <div className="suggestion">
      <ReactMarkdown linkTarget="_blank" children={message} remarkPlugins={[remarkGfm]} />
      <span className="suggestion__sub">AI generated results can be wrong.</span>
    </div>
  )
}

export default Suggestion
