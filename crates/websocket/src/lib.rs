use futures_util::{SinkExt, StreamExt};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::tungstenite::handshake::server::{Request, Response};

pub async fn start_server() {
    let addr = "127.0.0.1:5858".to_string();

    // Create the event loop and TCP listener we'll accept connections on.
    let try_socket = TcpListener::bind(&addr).await;
    let listener = try_socket.expect("Failed to bind");

    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(accept_connection(stream));
    }
}

async fn accept_connection(stream: TcpStream) -> tokio_tungstenite::tungstenite::Result<()> {
    let mut path = String::new();
    let callback = |req: &Request, response: Response| {
        path = req.uri().path().to_string();
        Ok(response)
    };
    let mut ws_stream = tokio_tungstenite::accept_hdr_async(stream, callback)
        .await
        .expect("Error during the websocket handshake occurred");
    while let Some(msg) = ws_stream.next().await {
        let msg = msg?;
        println!("{}: {}", path, msg);
        if msg.is_text() || msg.is_binary() {
            ws_stream.send(msg).await?;
        }
    }

    Ok(())
}
