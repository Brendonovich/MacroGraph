use rspc::alpha::AlphaRouter;
use serde::Serialize;
use specta::Type;

use crate::R;

pub fn router() -> AlphaRouter<()> {
    #[derive(Type, Serialize)]
    enum Entry {
        Dir(String),
        File(String),
    }

    R.router().procedure(
        "list",
        R.query(|_, path: String| async move {
            std::fs::read_dir(path)
                .unwrap()
                .map(|e| {
                    let e = e.unwrap();
                    let path = e.path();
                    let path = path.file_name().unwrap().to_str().unwrap().to_string();
                    if e.file_type().unwrap().is_dir() {
                        Entry::Dir(path)
                    } else {
                        Entry::File(path)
                    }
                })
                .collect::<Vec<_>>()
        }),
    )
}
