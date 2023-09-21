use std::{collections::HashMap, time::Duration};

use http::{header, HeaderName, HeaderValue, Method, StatusCode};
use reqwest::redirect::Policy;
use serde::Serialize;
use specta::Type;
use tauri::{command, AppHandle};

use super::{Error, FetchRequest, HttpExt, RequestId};

#[derive(Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FetchResponse {
    status: u16,
    status_text: String,
    headers: Vec<(String, String)>,
    url: String,
}

#[command]
#[specta::specta]
pub async fn fetch(
    app: AppHandle<tauri::Wry>,
    method: String,
    url: url::Url,
    headers: Vec<(String, String)>,
    data: Option<Vec<u8>>,
    connect_timeout: Option<u32>,
    max_redirections: Option<u32>,
) -> super::Result<RequestId> {
    let scheme = url.scheme();
    let method = Method::from_bytes(method.as_bytes())?;
    let headers: HashMap<String, String> = HashMap::from_iter(headers);

    match scheme {
        "http" | "https" => {
            let mut builder = reqwest::ClientBuilder::new();

            if let Some(timeout) = connect_timeout {
                builder = builder.connect_timeout(Duration::from_millis(timeout as u64));
            }

            if let Some(max_redirections) = max_redirections {
                builder = builder.redirect(if max_redirections == 0 {
                    Policy::none()
                } else {
                    Policy::limited(max_redirections as usize)
                });
            }

            let mut request = builder.build()?.request(method.clone(), url);

            for (key, value) in &headers {
                let name = HeaderName::from_bytes(key.as_bytes())?;
                let v = HeaderValue::from_bytes(value.as_bytes())?;
                if !matches!(name, header::HOST | header::CONTENT_LENGTH) {
                    request = request.header(name, v);
                }
            }

            // POST and PUT requests should always have a 0 length content-length,
            // if there is no body. https://fetch.spec.whatwg.org/#http-network-or-cache-fetch
            if data.is_none() && matches!(method, Method::POST | Method::PUT) {
                request = request.header(header::CONTENT_LENGTH, HeaderValue::from(0));
            }

            if headers.contains_key(header::RANGE.as_str()) {
                // https://fetch.spec.whatwg.org/#http-network-or-cache-fetch step 18
                // If httpRequest’s header list contains `Range`, then append (`Accept-Encoding`, `identity`)
                request = request.header(
                    header::ACCEPT_ENCODING,
                    HeaderValue::from_static("identity"),
                );
            }

            if !headers.contains_key(header::USER_AGENT.as_str()) {
                request = request.header(header::USER_AGENT, HeaderValue::from_static("tauri"));
            }

            if let Some(data) = data {
                request = request.body(data);
            }

            let http_state = app.http();
            let rid = http_state.next_id();
            let fut = async move { Ok(request.send().await.map_err(Into::into)) };
            let mut request_table = http_state.requests.lock().await;
            request_table.insert(rid, FetchRequest::new(Box::pin(fut)));

            Ok(rid)
        }
        "data" => {
            let data_url =
                data_url::DataUrl::process(url.as_str()).map_err(|_| Error::DataUrlError)?;
            let (body, _) = data_url
                .decode_to_vec()
                .map_err(|_| Error::DataUrlDecodeError)?;

            let response = http::Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, data_url.mime_type().to_string())
                .body(reqwest::Body::from(body))?;

            let http_state = app.http();
            let rid = http_state.next_id();
            let fut = async move { Ok(Ok(reqwest::Response::from(response))) };
            let mut request_table = http_state.requests.lock().await;
            request_table.insert(rid, FetchRequest::new(Box::pin(fut)));
            Ok(rid)
        }
        _ => Err(Error::SchemeNotSupport(scheme.to_string())),
    }
}

#[command]
#[specta::specta]
pub async fn fetch_cancel(app: AppHandle<tauri::Wry>, rid: RequestId) -> super::Result<()> {
    let mut request_table = app.http().requests.lock().await;
    let req = request_table
        .get_mut(&rid)
        .ok_or(Error::InvalidRequestId(rid))?;
    *req = FetchRequest::new(Box::pin(async { Err(Error::RequestCanceled) }));
    Ok(())
}

#[command]
#[specta::specta]
pub async fn fetch_send(
    app: AppHandle<tauri::Wry>,
    rid: RequestId,
) -> super::Result<FetchResponse> {
    let mut request_table = app.http().requests.lock().await;
    let req = request_table
        .remove(&rid)
        .ok_or(Error::InvalidRequestId(rid))?;

    let res = match req.0.lock().await.as_mut().await {
        Ok(Ok(res)) => res,
        Ok(Err(e)) | Err(e) => return Err(e),
    };

    let status = res.status();
    let url = res.url().to_string();
    let mut headers = Vec::new();
    for (key, val) in res.headers().iter() {
        headers.push((
            key.as_str().into(),
            String::from_utf8(val.as_bytes().to_vec())?,
        ));
    }

    app.http().responses.lock().await.insert(rid, res);

    Ok(FetchResponse {
        status: status.as_u16(),
        status_text: status.canonical_reason().unwrap_or_default().to_string(),
        headers,
        url,
    })
}

#[command]
#[specta::specta]
pub(crate) async fn fetch_read_body(
    app: AppHandle<tauri::Wry>,
    rid: RequestId,
) -> super::Result<Vec<u8>> {
    let mut response_table = app.http().responses.lock().await;
    let res = response_table
        .remove(&rid)
        .ok_or(Error::InvalidRequestId(rid))?;

    Ok(res.bytes().await?.to_vec())
}
