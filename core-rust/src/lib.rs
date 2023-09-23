mod fs;
mod oauth;
mod websocket;

use rspc::{alpha::Rspc, Config, Router};

#[allow(non_upper_case_globals)]
pub(self) const R: Rspc<()> = Rspc::new();

pub fn router() -> Router {
    R.router()
        .merge("fs.", fs::router())
        .merge("oauth.", oauth::router())
        .merge("websocket.", websocket::router())
        .build(Config::new().export_ts_bindings(
            std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../core/src/core.ts"),
        ))
}
