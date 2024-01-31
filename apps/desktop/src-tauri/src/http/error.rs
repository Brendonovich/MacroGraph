use serde::{Serialize, Serializer};

use super::RequestId;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Network(#[from] reqwest::Error),
    #[error(transparent)]
    Http(#[from] http::Error),
    #[error(transparent)]
    HttpInvalidHeaderName(#[from] http::header::InvalidHeaderName),
    #[error(transparent)]
    HttpInvalidHeaderValue(#[from] http::header::InvalidHeaderValue),
    /// URL not allowed by the scope.
    #[error(transparent)]
    UrlParse(#[from] url::ParseError),
    /// HTTP method error.
    #[error(transparent)]
    HttpMethod(#[from] http::method::InvalidMethod),
    #[error("scheme {0} not supported")]
    SchemeNotSupport(String),
    #[error("Request canceled")]
    RequestCanceled,
    #[error("failed to process data url")]
    DataUrl,
    #[error("failed to decode data url into bytes")]
    DataUrlDecode,
    #[error("invalid request id: {0}")]
    InvalidRequestId(RequestId),
    #[error(transparent)]
    Utf8(#[from] std::string::FromUtf8Error),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type Result<T> = std::result::Result<T, Error>;
