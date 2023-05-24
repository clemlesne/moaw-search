import "./error.scss"

function Error({ code, message }) {
  return (
    <div className="error">
      <p>Code: {code}</p>
      <p>Message: {message}</p>
    </div>
  )
}

export default Error
