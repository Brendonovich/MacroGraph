use std::process::{Command, Stdio};

use rspc::alpha::AlphaRouter;
use serde::Serialize;
use specta::Type;

use crate::R;

pub fn router() -> AlphaRouter<super::Ctx> {
    R.router().procedure(
        "execute",
        R.mutation(|_, cmd: String| async move {
            tokio::task::spawn_blocking(move || {
                let mut segments = cmd.split(" ");

                let command = segments.next().unwrap();
                let args: Vec<_> = segments.collect();

                Command::new(command)
                    .args(args)
                    .stdout(Stdio::inherit())
                    .stderr(Stdio::inherit())
                    .output()
                    .unwrap();
            })
            .await
            .unwrap();
        }),
    )
}
