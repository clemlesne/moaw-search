import "./stats.scss"

function Stats({ total, time }) {
  return (
    <p className="stats"> About {total} results ({time.toFixed(3).toLocaleString()} seconds)</p>
  )
}

export default Stats
